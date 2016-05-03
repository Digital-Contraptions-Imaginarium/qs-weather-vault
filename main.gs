/* *************************************************************************
   This script was written to create an archive of weather forecast data 
   in proximity of the latest recorded location, using the free APIs 
   provided by Open Weather Map at http://openweathermap.org/api . By 
   limiting the request to no more than 60 per minute the service is free. 
   The data is licensed under CC BY-SA 4.0.
   ************************************************************************* */

var SPREADSHEET_ID = "1XN-SAt3ahKflrnQLkanv-zSVnhztgfWU4bT37ZrzAqU",
    SHEET_NAME = "main", 
    GEOLOCATION_SPREADSHEET_ID = "1uN9fOpGZae7w7y2RhrX4MmBRliWMM_1QT5tQK0Pa1oA",
    GEOLOCATION_SHEET_NAME = "main",
    UTILISATION_SOFT_LIMIT = .95,
    API_KEY = PropertiesService.getScriptProperties().getProperty("OPEN_WEATHER_MAP_API_KEY");

var geolocationSheet = SpreadsheetApp.openById(GEOLOCATION_SPREADSHEET_ID).getSheetByName(GEOLOCATION_SHEET_NAME),
    sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("main");

// Deletes the oldest recordings to keep the total size of the vault within
// the specified soft limit.
var garbageCollect = function (callback) {
    // Note: a Google spreadsheet can contain max 2m cells according to
    // https://support.google.com/drive/answer/37603?hl=en .
    if (sheet.getLastRow() * sheet.getLastColumn() > 2000000 * UTILISATION_SOFT_LIMIT) {
        sheet.deleteRows(2, 1 + Math.floor((sheet.getLastRow() * sheet.getLastColumn() - 2000000 * UTILISATION_SOFT_LIMIT) / 2)); 
    }
    callback(null);
}

var fetchActual = function (location, callback) {
    // TODO: check the return code and manage errors
    callback(null, JSON.parse(UrlFetchApp.fetch("http://api.openweathermap.org/data/2.5/weather?APPID=" + API_KEY + "&lat=" + location.lat + "&lon=" + location.lon + "&mode=json&units=metric").getContentText()));
}

var dateToCSVDate = function (d) {
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":" + ("0" + d.getSeconds()).slice(-2); 
}

var CSVDateToDate = function (d) {
  var temp = d.match(/ *(\d{4})-(\d{2})-(\d{2}) +(\d{1,2}):(\d{2}):(\d{2}) */);
  return temp ? new Date(temp[1], temp[2] - 1, temp[3], temp[4] || 0, temp[5] || 0, temp[6] || 0, 0) : null;
}

var fetchAndStoreActual = function (location, callback) {
    var fetchedOn = new Date();     
    fetchActual(location, function (err, data) {
        sheet.getRange((sheet.getLastRow() + 1) + ":" + (sheet.getLastRow() + 1)).setValues([[
            dateToCSVDate(fetchedOn),
            JSON.stringify(data) 
        ]]);  
        callback(null);
    });
}

function run () {
    var latestLocation = _.pick(JSON.parse(geolocationSheet.getRange("R" + geolocationSheet.getLastRow() + "C2:R" + geolocationSheet.getLastRow() + "C2").getValue()), "lat", "lon");
    async.series([
      function (callback) { fetchAndStoreActual(latestLocation, callback); },
        garbageCollect
    ], function (err) { });
}

