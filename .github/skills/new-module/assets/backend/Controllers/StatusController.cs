using Microsoft.AspNetCore.Mvc;

namespace {{MODULE_NAME}}.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatusController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok", module = "{{MODULE_NAME}}" });
}
