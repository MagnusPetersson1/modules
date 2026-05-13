namespace Visualizer.Models;

// ── Workspace root ────────────────────────────────────────────────────────────

public record WorkspaceModel(
    WorkspaceMeta Workspace,
    ModelSection Model,
    List<ViewModel> Views
);

public record WorkspaceMeta(
    string Name,
    string? Version = null,
    WorkspaceContext? Context = null
);

/// <summary>
/// Describes what is in scope for this workspace — used by AI to contextualise
/// layout suggestions, element completeness checks, and style recommendations.
/// </summary>
public record WorkspaceContext(
    string? Domain = null,       // e.g. "E-Commerce", "Banking", "Healthcare"
    string? Perspective = null,  // e.g. "System Context", "Container", "Sequence"
    string? Scope = null,        // what is explicitly included/excluded
    string? Audience = null,     // e.g. "Engineering leads", "Product managers"
    string? Notes = null         // free-form additional context for AI
);

// ── Model section ─────────────────────────────────────────────────────────────

public record ModelSection(
    List<ElementModel> Elements,
    List<RelationshipModel> Relationships
);

public record ElementModel(
    string Id,
    string Name,
    string Type,           // person | system | application | component | database |
                           // service | process | capability | node | device |
                           // annotation | sticky-note | callout | boundary | divider
    string? Description = null,
    List<string>? Tags = null,
    string? Layer = null,  // business | application | technology | infrastructure | motivation | strategy
    string? Tech = null,
    string? Parent = null,
    string? Text = null    // for annotation/sticky-note types
);

public record RelationshipModel(
    string From,
    string To,
    string? Id = null,
    string? Label = null,
    string? Type = null    // uses | realizes | triggers | flows-to | assigned-to |
                           // composed-of | serves | accesses | association
);

// ── Views ─────────────────────────────────────────────────────────────────────

public record ViewModel(
    string Id,
    string? Name,
    string Type,           // c4-context | c4-container | c4-component |
                           // archimate-layered | sequence | process | infrastructure
    List<string>? Include = null,
    List<LayerBand>? Layers = null,
    List<DisplayLayer>? DisplayLayers = null,
    LayoutConfig? Layout = null,
    Dictionary<string, PositionModel>? Positions = null,
    ViewStyles? Styles = null,
    string? Theme = null,  // default | dark | blueprint | corporate | archimate
    // Sequence-specific
    List<string>? Participants = null,
    List<SequenceStep>? Steps = null
);

public record LayerBand(
    string Id,
    string? Name = null,
    string? Color = null,
    List<string>? Include = null
);

public record DisplayLayer(
    string Id,
    int ZIndex = 0,
    bool Visible = true,
    List<string>? Elements = null
);

public record LayoutConfig(
    string Algorithm = "layered",  // layered | force | grid | manual
    string Direction = "top-down"  // top-down | left-right
);

public record PositionModel(double X, double Y);

public record ViewStyles(
    Dictionary<string, ElementStyleConfig>? Elements = null,
    Dictionary<string, RelationshipStyleConfig>? Relationships = null
);

public record ElementStyleConfig(
    string? Color = null,
    string? Icon = null,
    string? Shape = null,  // default | person | cylinder | cloud | hexagon | diamond | sticky-note | callout | boundary
    int? FontSize = null,
    int? Width = null,
    int? Height = null,
    string? Background = null,
    string? ContentAlign = null,   // top-left | top-center | top-right | center-left | center | center-right | bottom-left | bottom-center | bottom-right
    string? LabelPlacement = null  // top | bottom | left | right
);

public record RelationshipStyleConfig(
    string? LineStyle = null,    // solid | dashed | dotted | double
    string? ArrowEnd = null,     // open | filled | none | diamond | odiamond
    string? ArrowStart = null,
    string? Color = null,
    int? Thickness = null,
    string? BendStyle = null,    // straight | curved | orthogonal | elbow
    string? LabelPosition = null, // center | source | target
    string? SourceHandle = null,
    string? TargetHandle = null
);

// ── Sequence ──────────────────────────────────────────────────────────────────

public record SequenceStep(
    string? From = null,
    string? To = null,
    string? Label = null,
    string? Type = null,          // sync | async | return | create | destroy
    string? Fragment = null,      // alt | loop | par | opt | critical | break
    string? Condition = null,
    List<SequenceStep>? Steps = null
);

// ── Parse result ──────────────────────────────────────────────────────────────

public record ParseResult(
    WorkspaceModel? Model,
    List<ParseError> Errors
);

public record ParseError(
    string Message,
    string Severity = "error",  // error | warning | info
    int? Line = null,
    int? Column = null
);
