// API Key and URL
var api_key = config.API_KEY;

// Wait for the page to load before updating temperature
window.addEventListener('load', () => {
    const button = document.getElementById('weather_update_button')
    if(button !== null) button.addEventListener('click', () => search_button_pressed());
});

// K -> F
function kelvin_to_fahrenheit(kelvin_temp){
    return 1.8 * (kelvin_temp - 273.15) + 32;
}


// Call the OpenWeather API with the user-provided city to get the relevant weather data
async function get_weather_data(city){
    let api_url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${api_key}`;
    const response = await fetch(api_url);
    return await response.json();
}

/* 
    Update the weather icon's display
    Temperature, feels-like temperature, humidity, and geo-coordinates are updated according to the city provided by the user
*/
async function update_temperature(city){
    // Make an API call to get the city's weather data
    const weather_data = await get_weather_data(city);
    console.log(weather_data)
    // Locate the HTML tags pertaining to each field of the weather data
    const cords_display = document.getElementById('cords_id');
    const temp_img = document.getElementById('weather_image_id');
    const temp_display = document.getElementById('temp_id');
    const feels_like_display = document.getElementById('feels_like_id');
    const humidity_display = document.getElementById("humidity_id");
    // Retrieve each of the data fields from the API call
    const temp = kelvin_to_fahrenheit( Number(weather_data.main.temp) );
    const feels_like_temp = kelvin_to_fahrenheit( Number(weather_data.main.feels_like) );
    const weather_type = weather_data.weather[0].main;
    // Render geo-coordinates
    cords_display.textContent = 'Coordinates: (' + weather_data.coord['lat'] + ', ' + weather_data.coord['lon'] + ')';
    // Render temperature on display 
    temp_display.style.fontSize = "80px";
    temp_display.textContent = String( Math.trunc( temp ) ) + "°F";  
    // Choose appropriate temperature icon
    if( weather_type == 'Clouds'){
        temp_img.src = "images/weather/cloudy.svg";
    } else{
        temp_img.src = "images/weather/sunny.svg";
    }
    // Render "feels-like" temperature 
    feels_like_display.textContent = "(Feels like: " + String( Math.trunc(feels_like_temp)) + "°F)";
    // Render humidity
    humidity_display.textContent = "Humidity: " + weather_data.main.humidity + "%";
}

async function search_button_pressed(){
    // Get the city found in the search's text input box
    let city = document.getElementById('location_input').value;
    // If no city was provided, do not update the weather icon
    if( city === null || city === "" ) return;
    // Update the weather icon box 
    update_temperature(city);
}