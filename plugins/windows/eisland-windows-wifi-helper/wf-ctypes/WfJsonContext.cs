using System.Text.Json.Serialization;

namespace eIslandWifiHelper;

[JsonSerializable(typeof(WifiInfo))]
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
internal partial class WfJsonContext : JsonSerializerContext
{
}
