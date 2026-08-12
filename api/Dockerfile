FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src
COPY Vetigo.Api.csproj .
RUN dotnet restore Vetigo.Api.csproj
COPY . .
RUN dotnet publish Vetigo.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS runtime
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "Vetigo.Api.dll"]
