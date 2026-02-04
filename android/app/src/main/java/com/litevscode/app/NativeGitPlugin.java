package com.litevscode.app;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "NativeGit")
public class NativeGitPlugin extends Plugin {

  private static final long COMMAND_TIMEOUT_SECONDS = 15L;

  @PluginMethod
  public void isAvailable(PluginCall call) {
    try {
      CommandResult result = runGitCommand(null, Arrays.asList("--version"));
      JSObject response = new JSObject();
      response.put("available", result.exitCode == 0 && result.output.startsWith("git version "));
      call.resolve(response);
    } catch (Exception exception) {
      JSObject response = new JSObject();
      response.put("available", false);
      call.resolve(response);
    }
  }

  @PluginMethod
  public void status(PluginCall call) {
    String repoPath = requireRepoPath(call);
    if (repoPath == null) {
      return;
    }

    try {
      ensureGitRepository(repoPath);

      CommandResult statusResult = runGitCommand(repoPath, Arrays.asList("status", "--porcelain=1", "-b"));
      if (statusResult.exitCode != 0) {
        call.reject(errorMessage("Failed to read git status.", statusResult.output));
        return;
      }

      CommandResult branchResult = runGitCommand(repoPath, Arrays.asList("branch", "--format=%(refname:short)"));
      if (branchResult.exitCode != 0) {
        call.reject(errorMessage("Failed to list branches.", branchResult.output));
        return;
      }

      ParsedStatus parsedStatus = parseStatus(statusResult.output);
      JSObject response = new JSObject();
      response.put("currentBranch", parsedStatus.currentBranch);
      response.put("branches", parseBranches(branchResult.output));
      response.put("staged", parsedStatus.staged);
      response.put("unstaged", parsedStatus.unstaged);
      call.resolve(response);
    } catch (Exception exception) {
      call.reject(exception.getMessage());
    }
  }

  @PluginMethod
  public void stage(PluginCall call) {
    String repoPath = requireRepoPath(call);
    String path = requirePath(call, "path");
    if (repoPath == null || path == null) {
      return;
    }

    executeWriteCommand(call, repoPath, Arrays.asList("add", "--", path), "Failed to stage file.");
  }

  @PluginMethod
  public void unstage(PluginCall call) {
    String repoPath = requireRepoPath(call);
    String path = requirePath(call, "path");
    if (repoPath == null || path == null) {
      return;
    }

    try {
      ensureGitRepository(repoPath);

      CommandResult restoreResult = runGitCommand(repoPath, Arrays.asList("restore", "--staged", "--", path));
      if (restoreResult.exitCode == 0) {
        call.resolve();
        return;
      }

      CommandResult resetResult = runGitCommand(repoPath, Arrays.asList("reset", "HEAD", "--", path));
      if (resetResult.exitCode != 0) {
        call.reject(errorMessage("Failed to unstage file.", resetResult.output));
        return;
      }

      call.resolve();
    } catch (Exception exception) {
      call.reject(exception.getMessage());
    }
  }

  @PluginMethod
  public void stageAll(PluginCall call) {
    String repoPath = requireRepoPath(call);
    if (repoPath == null) {
      return;
    }

    executeWriteCommand(call, repoPath, Arrays.asList("add", "-A"), "Failed to stage all changes.");
  }

  @PluginMethod
  public void unstageAll(PluginCall call) {
    String repoPath = requireRepoPath(call);
    if (repoPath == null) {
      return;
    }

    executeWriteCommand(call, repoPath, Arrays.asList("reset"), "Failed to unstage all changes.");
  }

  @PluginMethod
  public void commit(PluginCall call) {
    String repoPath = requireRepoPath(call);
    String message = requirePath(call, "message");
    if (repoPath == null || message == null) {
      return;
    }

    executeWriteCommand(call, repoPath, Arrays.asList("commit", "-m", message), "Failed to commit staged changes.");
  }

  @PluginMethod
  public void createBranch(PluginCall call) {
    String repoPath = requireRepoPath(call);
    String name = requirePath(call, "name");
    if (repoPath == null || name == null) {
      return;
    }

    executeWriteCommand(call, repoPath, Arrays.asList("branch", name), "Failed to create branch.");
  }

  @PluginMethod
  public void switchBranch(PluginCall call) {
    String repoPath = requireRepoPath(call);
    String name = requirePath(call, "name");
    if (repoPath == null || name == null) {
      return;
    }

    try {
      ensureGitRepository(repoPath);

      CommandResult switchResult = runGitCommand(repoPath, Arrays.asList("switch", name));
      if (switchResult.exitCode == 0) {
        call.resolve();
        return;
      }

      CommandResult checkoutResult = runGitCommand(repoPath, Arrays.asList("checkout", name));
      if (checkoutResult.exitCode != 0) {
        call.reject(errorMessage("Failed to switch branch.", checkoutResult.output));
        return;
      }

      call.resolve();
    } catch (Exception exception) {
      call.reject(exception.getMessage());
    }
  }

  private void executeWriteCommand(PluginCall call, String repoPath, List<String> args, String failureMessage) {
    try {
      ensureGitRepository(repoPath);
      CommandResult result = runGitCommand(repoPath, args);
      if (result.exitCode != 0) {
        call.reject(errorMessage(failureMessage, result.output));
        return;
      }
      call.resolve();
    } catch (Exception exception) {
      call.reject(exception.getMessage());
    }
  }

  private String requireRepoPath(PluginCall call) {
    String repoPath = call.getString("repoPath");
    if (repoPath == null || repoPath.trim().isEmpty()) {
      call.reject("Repository path is required.");
      return null;
    }

    return repoPath.trim();
  }

  private String requirePath(PluginCall call, String key) {
    String value = call.getString(key);
    if (value == null || value.trim().isEmpty()) {
      call.reject(key + " is required.");
      return null;
    }

    return value.trim();
  }

  private void ensureGitRepository(String repoPath) throws Exception {
    CommandResult result = runGitCommand(repoPath, Arrays.asList("rev-parse", "--is-inside-work-tree"));
    if (result.exitCode != 0 || !"true".equalsIgnoreCase(result.output.trim())) {
      throw new Exception(errorMessage("Repository path is not a git repository.", result.output));
    }
  }

  private CommandResult runGitCommand(String repoPath, List<String> args) throws Exception {
    List<String> command = new ArrayList<>();
    command.add("git");
    if (repoPath != null && !repoPath.trim().isEmpty()) {
      command.add("-C");
      command.add(repoPath.trim());
    }
    command.addAll(args);

    ProcessBuilder processBuilder = new ProcessBuilder(command);
    processBuilder.redirectErrorStream(true);

    Process process = processBuilder.start();
    boolean finished = process.waitFor(COMMAND_TIMEOUT_SECONDS, TimeUnit.SECONDS);
    if (!finished) {
      process.destroyForcibly();
      throw new Exception("Git command timed out.");
    }

    String output = readStream(process.getInputStream()).trim();
    return new CommandResult(process.exitValue(), output);
  }

  private String readStream(InputStream stream) throws IOException {
    BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
    StringBuilder builder = new StringBuilder();
    String line;
    while ((line = reader.readLine()) != null) {
      if (builder.length() > 0) {
        builder.append('\n');
      }
      builder.append(line);
    }
    return builder.toString();
  }

  private ParsedStatus parseStatus(String output) {
    String[] lines = output.split("\\r?\\n");
    String currentBranch = "main";
    Map<String, String> staged = new LinkedHashMap<>();
    Map<String, String> unstaged = new LinkedHashMap<>();

    for (String line : lines) {
      if (line.startsWith("## ")) {
        String branchPart = line.substring(3).trim();
        int splitIndex = branchPart.indexOf("...");
        if (splitIndex >= 0) {
          branchPart = branchPart.substring(0, splitIndex);
        }
        int spaceIndex = branchPart.indexOf(' ');
        if (spaceIndex >= 0) {
          branchPart = branchPart.substring(0, spaceIndex);
        }
        if (!branchPart.isEmpty()) {
          currentBranch = branchPart;
        }
        continue;
      }

      if (line.length() < 3) {
        continue;
      }

      if (line.startsWith("?? ")) {
        String untrackedPath = extractPath(line.substring(3).trim());
        if (!untrackedPath.isEmpty()) {
          unstaged.put(untrackedPath, "added");
        }
        continue;
      }

      char x = line.charAt(0);
      char y = line.charAt(1);
      String path = extractPath(line.substring(3).trim());
      if (path.isEmpty()) {
        continue;
      }

      if (x != ' ' && x != '?') {
        staged.put(path, mapChangeType(x));
      }
      if (y != ' ' && y != '?') {
        unstaged.put(path, mapChangeType(y));
      }
    }

    return new ParsedStatus(currentBranch, toChangeArray(staged), toChangeArray(unstaged));
  }

  private String extractPath(String rawPath) {
    int renameSeparator = rawPath.indexOf(" -> ");
    if (renameSeparator >= 0 && renameSeparator + 4 < rawPath.length()) {
      return rawPath.substring(renameSeparator + 4).trim();
    }
    return rawPath.trim();
  }

  private String mapChangeType(char statusChar) {
    if (statusChar == 'A') {
      return "added";
    }
    if (statusChar == 'D') {
      return "deleted";
    }
    return "modified";
  }

  private JSArray toChangeArray(Map<String, String> changes) {
    JSArray array = new JSArray();
    for (Map.Entry<String, String> entry : changes.entrySet()) {
      JSObject item = new JSObject();
      item.put("path", entry.getKey());
      item.put("type", entry.getValue());
      array.put(item);
    }
    return array;
  }

  private JSArray parseBranches(String output) {
    JSArray branches = new JSArray();
    String[] lines = output.split("\\r?\\n");
    for (String line : lines) {
      String branch = line.trim();
      if (!branch.isEmpty()) {
        branches.put(branch);
      }
    }
    return branches;
  }

  private String errorMessage(String prefix, String detail) {
    String normalizedDetail = detail == null ? "" : detail.trim();
    if (normalizedDetail.isEmpty()) {
      return prefix;
    }

    return prefix + " " + normalizedDetail;
  }

  private static class ParsedStatus {
    final String currentBranch;
    final JSArray staged;
    final JSArray unstaged;

    ParsedStatus(String currentBranch, JSArray staged, JSArray unstaged) {
      this.currentBranch = currentBranch;
      this.staged = staged;
      this.unstaged = unstaged;
    }
  }

  private static class CommandResult {
    final int exitCode;
    final String output;

    CommandResult(int exitCode, String output) {
      this.exitCode = exitCode;
      this.output = output;
    }
  }
}
