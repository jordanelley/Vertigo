using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Vetigo.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveSeedRides : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Rides",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Rides",
                keyColumn: "Id",
                keyValue: 2);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Rides",
                columns: new[] { "Id", "Distance", "RideName", "Time" },
                values: new object[,]
                {
                    { 1, 18.399999999999999, "Sunday Loop", 62.0 },
                    { 2, 6.2000000000000002, "Downhill Run", 18.0 }
                });
        }
    }
}
