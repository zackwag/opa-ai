# OPA-AI

A property assessment appeal tool for Philadelphia homeowners. Search your address and instantly find comparable nearby homes that are assessed lower than yours — giving you the data you need to challenge an unfair property tax assessment.

**Source:** [github.com/zackwag/opa-ai](https://github.com/zackwag/opa-ai)

## What It Does

1. **Search your address** — type your Philadelphia property address with autocomplete suggestions
2. **See your assessment** — view your property's assessed market value and characteristics
3. **Find lower-assessed comps** — automatically finds similar nearby homes (same size, beds, baths, age) that the city has assessed at a lower value
4. **View on a map** — OpenStreetMap integration shows your property and all comps on an interactive map with a configurable search radius
5. **Review recent sales** — see what similar nearby homes actually sold for recently, highlighting those that sold below your assessed value
6. **Generate an appeal PDF** — select up to 5 of the strongest comps and generate a formatted PDF report with your property, the comparables, recent sales evidence, and over-assessment analysis

## Data Source

All data comes from the **Philadelphia Office of Property Assessment (OPA)** public dataset via the City of Philadelphia's Carto SQL API. This includes:

- Property assessments (market value)
- Physical characteristics (beds, baths, sqft, year built, etc.)
- Sale history (price and date)
- Geographic coordinates (for proximity calculations)

No API key is required. The data is publicly available.

## Running with Docker

If you've never used Docker before, here's how to get started:

### 1. Install Docker

Download and install Docker Desktop for your operating system:

- **Mac:** https://docs.docker.com/desktop/install/mac-install/
- **Windows:** https://docs.docker.com/desktop/install/windows-install/
- **Linux:** https://docs.docker.com/desktop/install/linux/

After installing, open Docker Desktop and wait for it to say "Running" (green icon in your system tray/menu bar).

### 2. Run OPA-AI

Open a terminal (Terminal on Mac, Command Prompt or PowerShell on Windows) and run:

```sh
docker run -d -p 8080:80 zackwag/opa-ai
```

That's it. This downloads the app and starts it.

### 3. Open in Your Browser

Go to: **http://localhost:8080**

### 4. Stopping the App

To stop it, run:

```sh
docker ps
```

Find the container ID (first column), then:

```sh
docker stop <container-id>
```

### Updating to the Latest Version

```sh
docker pull zackwag/opa-ai
docker stop <container-id>
docker run -d -p 8080:80 zackwag/opa-ai
```

## Development

```sh
git clone https://github.com/zackwag/opa-ai.git
cd opa-ai
npm install
npm run dev
```

The dev server runs at http://localhost:5173.

To build for production:

```sh
npm run build
```

## Disclaimer

This tool is for **research purposes only**. Generated PDFs include a watermark and should not be submitted directly to the Board of Revision of Taxes. Always verify data independently before filing a formal appeal.
