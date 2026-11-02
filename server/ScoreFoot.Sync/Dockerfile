# Build context: server/ (see docker-compose.yml)
FROM mcr.microsoft.com/dotnet/sdk:10.0.402 AS build
WORKDIR /src
COPY . .
RUN dotnet publish ScoreFoot.Sync/ScoreFoot.Sync.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/runtime:10.0.13
WORKDIR /app
COPY --from=build /app .
# The images volume is initialised from this folder, so the non-root user can write to it.
RUN mkdir -p /data/images && chown app /data/images
USER app
ENTRYPOINT ["dotnet", "ScoreFoot.Sync.dll"]
