namespace Visualizer.Services.Import;

public record ImportResult(
    Visualizer.Models.WorkspaceModel Model,
    List<string> Warnings
);
