using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Vetigo.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Rides",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    RideName = table.Column<string>(type: "TEXT", nullable: false),
                    Distance = table.Column<double>(type: "REAL", nullable: false),
                    Time = table.Column<double>(type: "REAL", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rides", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Rides",
                columns: new[] { "Id", "Distance", "RideName", "Time" },
                values: new object[,]
                {
                    { 1, 18.399999999999999, "Sunday Loop", 62.0 },
                    { 2, 6.2000000000000002, "Downhill Run", 18.0 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Rides");
        }
    }
}
