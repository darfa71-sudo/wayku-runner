FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["WaykuRunner.Api.csproj", "./"]
RUN dotnet restore "WaykuRunner.Api.csproj"
COPY . .
RUN dotnet publish "WaykuRunner.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:5180
EXPOSE 5180
ENTRYPOINT ["dotnet", "WaykuRunner.Api.dll"]
