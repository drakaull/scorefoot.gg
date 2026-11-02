# Build context: server/ (see docker-compose.yml)
FROM mcr.microsoft.com/dotnet/sdk:10.0.402 AS build
WORKDIR /src
COPY . .
RUN dotnet publish ScoreFoot.Api/ScoreFoot.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0.13
WORKDIR /app
COPY --from=build /app .
USER app
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD ["dotnet", "ScoreFoot.Api.dll", "healthcheck"]
ENTRYPOINT ["dotnet", "ScoreFoot.Api.dll"]
