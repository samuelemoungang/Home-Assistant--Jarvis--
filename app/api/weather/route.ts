import { NextResponse } from "next/server"

const ZURICH = {
  latitude: 47.3769,
  longitude: 8.5417,
  timezone: "Europe/Zurich",
  location: "Zurich",
}

export async function GET() {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast")
    url.searchParams.set("latitude", String(ZURICH.latitude))
    url.searchParams.set("longitude", String(ZURICH.longitude))
    url.searchParams.set("timezone", ZURICH.timezone)
    url.searchParams.set("current", "temperature_2m,weather_code")
    url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min")
    url.searchParams.set("forecast_days", "5")

    const response = await fetch(url.toString(), { next: { revalidate: 1800 } })
    if (!response.ok) {
      throw new Error(`Weather request failed with ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      location: ZURICH.location,
      current: {
        temperature: Number(data?.current?.temperature_2m ?? 0),
        weatherCode: Number(data?.current?.weather_code ?? 3),
      },
      forecast: Array.isArray(data?.daily?.time)
        ? data.daily.time.map((date: string, index: number) => ({
            date,
            weatherCode: Number(data.daily.weather_code?.[index] ?? 3),
            tempMax: Number(data.daily.temperature_2m_max?.[index] ?? 0),
            tempMin: Number(data.daily.temperature_2m_min?.[index] ?? 0),
          }))
        : [],
    })
  } catch (error) {
    console.error("Weather API failed:", error)

    return NextResponse.json({
      location: ZURICH.location,
      current: {
        temperature: 12,
        weatherCode: 3,
      },
      forecast: [],
      fallback: true,
    })
  }
}
