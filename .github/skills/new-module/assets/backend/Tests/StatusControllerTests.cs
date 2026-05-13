using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using Xunit;

namespace {{MODULE_NAME}}.Tests;

public class StatusControllerTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task GetStatus_ReturnsOk()
    {
        var client = factory.CreateClient();
        var response = await client.GetAsync("/api/status");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
