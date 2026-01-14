using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Xml;

// Make sure we got the repo, are in the correct directory and on the "main" branch for parsing the "current"
// mapper_tree.json:
GitHelper.Setup();
GitHelper.Checkout("main");

List<MapperTreeEntry>? mapperTree = MapperHelper.ReadMapperTree();
if (mapperTree == null)
{
	Console.WriteLine("Failed to parse mapper_tree.json in main.");
	return -1;
}

// After we got the current tree data, go to the development branch:
GitHelper.Checkout("development");
GitHelper.PrepareStash(); // creates a temporary "_stash" folder used to ferry over changes to "main".
Directory.SetCurrentDirectory(GitHelper.RepoDirectory);

List<MapperInfo> updatedMappers = [];
foreach (var path in Directory.GetFiles(".", "*.xml", SearchOption.AllDirectories))
{
	var mapper = MapperHelper.GetInfo(path);
	if (mapper == null)
	{
		continue;
	}
	var treeEntry = mapperTree.FirstOrDefault(x => x.Path == mapper.Path);
	if (treeEntry?.Version != mapper.Version)
	{
		Console.WriteLine($"Mapper: {mapper.Path}\n    {treeEntry?.Version ?? "new"} -> {mapper.Version}");
		updatedMappers.Add(mapper);
		var stashPath = Path.Combine(GitHelper.StashDirectory, mapper.Path);
		Directory.CreateDirectory(Path.GetDirectoryName(stashPath)!);
		File.Copy(path, stashPath);
		var jsPath = mapper.Path.Replace(".xml", ".js");
		if (File.Exists(jsPath))
		{
			File.Copy(jsPath, Path.Combine(GitHelper.StashDirectory, jsPath));
		}
	}
}

if (updatedMappers.Count > 0)
{
	string commitBody = MapperHelper.CreateCommitBody(updatedMappers, mapperTree);
	foreach (var mapper in updatedMappers)
	{
		var treeItem = mapperTree.FirstOrDefault(x => x.Path == mapper.Path);
		if (treeItem == null)
		{
			mapperTree.Add(new MapperTreeEntry()
			{
				Path = mapper.Path,
				DateCreated = MapperHelper.ChangeTime,
				DisplayName = Path.GetFileName(mapper.Path).ToLower(),
				DateUpdated = MapperHelper.ChangeTime,
				Version = mapper.Version,
			});
		}
		else
		{
			treeItem.DateUpdated = MapperHelper.ChangeTime;
			treeItem.Version = mapper.Version;
		}
	}
	File.WriteAllText(
		Path.Combine(GitHelper.StashDirectory, "mapper_tree.json"),
		JsonSerializer.Serialize(mapperTree, JsonContext.Default.ListMapperTreeEntry)
	);
	GitHelper.TransferStash();
	GitHelper.PublishChanges(
		$"Updated {updatedMappers.Count} {(updatedMappers.Count == 1 ? "mapper" : "mappers")}",
		commitBody.ToString()
	);
}
else
{
	Console.WriteLine("No mapper version changes detected.");
}

return 0;

#region Helpers

public static class MapperHelper
{
	public static DateTimeOffset ChangeTime = DateTimeOffset.UtcNow;

	public static List<MapperTreeEntry>? ReadMapperTree()
	{
		string mapperTreeJson = File.ReadAllText("mapper_tree.json");
		if (mapperTreeJson == null)
		{
			return null;
		}
		try
		{
			return JsonSerializer.Deserialize(mapperTreeJson, JsonContext.Default.ListMapperTreeEntry);
		}
		catch
		{
			return null;
		}
	}

	public static MapperInfo? GetInfo(string path)
	{
		var document = new XmlDocument();
		document.Load(path);
		var mapperNode = document.SelectSingleNode("mapper");
		if (mapperNode == null)
		{
			return null;
		}
		var name = mapperNode.Attributes?.GetNamedItem("name")?.Value;
		var version = mapperNode.Attributes?.GetNamedItem("version")?.Value;
		if (version != null && name != null)
		{
			return new MapperInfo(name, version, path.Replace("./", ""));
		}
		return null;
	}

	public static string CreateCommitBody(List<MapperInfo> updatedMappers, List<MapperTreeEntry> mapperTree)
	{
		StringBuilder commitMessage = new StringBuilder();
		foreach (var mapper in updatedMappers)
		{
			var treeItem = mapperTree.FirstOrDefault(x => x.Path == mapper.Path);
			commitMessage.Append(mapper.Path)
				.Append(": ")
				.Append(treeItem?.Version ?? "new")
				.Append(" -> ")
				.Append(mapper.Version)
				.Append("\n");
		}

		return commitMessage.ToString();
	}
}

public static class Command
{
	public static void Run(string command, string arguments, bool silent = false)
	{
		Process process = new();
		process.StartInfo.RedirectStandardOutput = silent;
		process.StartInfo.FileName = command;
		process.StartInfo.Arguments = arguments;
		process.Start();
		process.WaitForExit();
	}
}

public static class GitHelper
{
	/// <summary>
	/// Account used for making commits. Also identifies where to clone from if necessary.
	/// </summary>
	public const string RepoAccount = "PokeAByte";

	/// <summary>
	/// Name of the repository.
	/// </summary>
	public const string RepoName = "mappers";

	/// <summary>
	/// The directory that serves as the standard work directory of the github action runner.
	/// </summary>
	public const string WorkingDirectory = "/home/runner/work/mappers";

	/// <summary>
	/// The directory into which the GitHub action runner cloned the mapper repository:
	/// <c>{WorkingDirectory}/{RepoName}</c>
	/// </summary>
	public static string RepoDirectory = Path.Combine(WorkingDirectory, RepoName);

	/// <summary>
	/// Holding area for files that need to be transferred from the development branch to the main branch. <br/>
	/// <c>{RepoDirectory}/_stash</c>
	/// </summary>
	public static string StashDirectory = Path.Combine(RepoDirectory, "_stash");

	/// <summary>
	/// Makes sure that all required directories exists and that the git repository has been cloned. <br/>
	/// Also sets up the git user. <br/>
	/// Leaves current directory as <see cref="RepoDirectory"/>.
	/// </summary>
	public static void Setup()
	{
		Directory.CreateDirectory(WorkingDirectory);
		Directory.SetCurrentDirectory(WorkingDirectory);
		if (!Directory.Exists(RepoDirectory))
		{
			Command.Run("git", $"clone https://github.com/{RepoAccount}/{RepoName}.git", silent: false);
		}
		Directory.SetCurrentDirectory(RepoDirectory);
		Command.Run("git", $"config user.email \"{RepoAccount}@users.noreply.github.com\"", silent: false);
		Command.Run("git", $"config user.name \"{RepoAccount}\"", silent: false);
	}

	/// <summary>
	/// Goes into the repository directory and then checks out the target branch.
	/// </summary>
	/// <param name="branch"> The target branch. </param>
	public static void Checkout(string branch)
	{
		Directory.SetCurrentDirectory(RepoDirectory);
		Console.WriteLine($"Checking out {branch} ...");
		Command.Run("git", "fetch", silent: true);
		Command.Run("git", $"checkout {branch}", silent: true);
		Command.Run("git", "pull", silent: true);
		Command.Run("git", "log --oneline -n 1");
	}

	/// <summary>
	/// Clears (if it exists) and then recreates the temporary stash directory. See <see cref="StashDirectory"/>.
	/// </summary>
	public static void PrepareStash()
	{
		// Clean existing:
		if (Directory.Exists(StashDirectory))
		{
			Directory.Delete(StashDirectory, true);
		}
		// Create fresh:
		Directory.CreateDirectory(StashDirectory);
	}

	/// <summary>
	/// Copies mapper files (and the mapper_tree.json) from the stash directory to the root of the git repo. <br/>
	/// Deletes the <see cref="StashDirectory"/> after.
	/// </summary>
	public static void TransferStash()
	{
		Checkout("main");
		foreach (var stashFile in Directory.GetFiles(StashDirectory, "*", SearchOption.AllDirectories))
		{
			File.Move(stashFile, stashFile.Replace(StashDirectory, RepoDirectory), overwrite: true);
		}
		Directory.Delete(StashDirectory, true);
	}

	/// <summary>
	/// Adds all files to the working tree, creates a commit and then pushed.
	/// </summary>
	/// <param name="commitHead">First line (or header) of the commit message.</param>
	/// <param name="commitBody">Body of the commit message.</param>
	public static void PublishChanges(string commitHead, string commitBody)
	{
		Console.WriteLine("Committing and pushing changes");
		Command.Run("git", $"add --all", silent: false);
		Command.Run("git", $"commit -a -m \"{commitHead}\" -m \"{commitBody}\"");
		Command.Run("git", $"push");
	}
}

#endregion

#region Models
/// <summary>
/// Mapper metadata optained from the XML itself (and it's location).
/// </summary>
/// <param name="Name">Name of the mapper, as per it's name attribute. </param>
/// <param name="Version">Version of the mapper, as per it's version attribute.</param>
/// <param name="Path">Path of the mapper XML file, relative to the respository root.</param>
public record MapperInfo(string Name, string Version, string Path);

/// <summary>
/// Entry of the <c>mapper_tree.json</c>.
/// </summary>
public class MapperTreeEntry
{
	[JsonPropertyName("display_name")]
	public required string DisplayName { get; set; }

	[JsonPropertyName("path")]
	public required string Path { get; set; }

	[JsonPropertyName("date_created")]
	public DateTimeOffset? DateCreated { get; set; }

	[JsonPropertyName("date_updated")]
	public DateTimeOffset? DateUpdated { get; set; }

	[JsonPropertyName("version")]
	public required string Version { get; set; }
};

[JsonSerializable(typeof(List<MapperTreeEntry>))]
[JsonSourceGenerationOptions(WriteIndented = true)]
public partial class JsonContext : JsonSerializerContext
{
}
#endregion