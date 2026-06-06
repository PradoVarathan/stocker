# Sector-organized stock universe — ~15 stocks per sector
# Each sector runs its own 100-round simulation

SECTORS: dict[str, list[str]] = {
    "Technology": [
        "AAPL", "MSFT", "NVDA", "AMD", "AVGO", "QCOM", "INTC", "TXN", "MU", "AMAT",
        "LRCX", "KLAC", "ASML", "CRM", "ADBE", "NOW", "ORCL", "IBM", "SNPS", "CDNS",
    ],
    "Software & Cloud": [
        "MSFT", "CRM", "ADBE", "NOW", "ORCL", "WDAY", "DDOG", "SNOW", "NET", "ZS",
        "CRWD", "PANW", "OKTA", "TEAM", "MDB", "GTLB", "HUBS", "VEEV", "SMAR", "DOCN",
    ],
    "Healthcare & Pharma": [
        "LLY", "JNJ", "MRK", "PFE", "ABBV", "BMY", "AMGN", "GILD", "REGN", "VRTX",
        "BIIB", "MRNA", "ALNY", "INCY", "EXAS", "ILMN", "DXCM", "HOLX", "PODD", "ACAD",
    ],
    "Medical Devices": [
        "MDT", "ABT", "TMO", "DHR", "BSX", "SYK", "ISRG", "EW", "ZBH", "BDX",
        "BAX", "RMD", "ALGN", "NVCR", "SWAV", "TNDM", "AXNX", "NTRA", "GRFS", "IRTC",
    ],
    "Banks & Financials": [
        "JPM", "BAC", "WFC", "GS", "MS", "C", "USB", "PNC", "TFC", "CFG",
        "FITB", "HBAN", "KEY", "RF", "MTB", "CMA", "ZION", "SIVB", "FRC", "WAL",
    ],
    "Insurance & Asset Mgmt": [
        "BLK", "SCHW", "AXP", "V", "MA", "SPGI", "MCO", "ICE", "CME", "CBOE",
        "PGR", "TRV", "MET", "PRU", "AFL", "ALL", "HIG", "LNC", "AIG", "RGA",
    ],
    "Energy & Oil": [
        "XOM", "CVX", "COP", "EOG", "PXD", "OXY", "DVN", "FANG", "MRO", "APA",
        "HES", "PSX", "MPC", "VLO", "PBF", "SLB", "HAL", "BKR", "FTI", "NOV",
    ],
    "Consumer Discretionary": [
        "AMZN", "TSLA", "HD", "MCD", "NKE", "SBUX", "TJX", "BKNG", "CMG", "YUM",
        "ROST", "DG", "DLTR", "BBY", "ETSY", "RH", "LULU", "CPRI", "TPR", "PVH",
    ],
    "Consumer Staples": [
        "PG", "KO", "PEP", "WMT", "COST", "MDLZ", "CL", "KMB", "GIS", "K",
        "SJM", "HRL", "CAG", "CPB", "MKC", "CLX", "CHD", "EL", "COTY", "SPB",
    ],
    "Industrials": [
        "CAT", "DE", "HON", "GE", "MMM", "RTX", "LMT", "NOC", "BA", "GD",
        "UPS", "FDX", "UNP", "CSX", "NSC", "EMR", "ETN", "PH", "ROK", "AME",
    ],
    "Communication & Media": [
        "GOOGL", "META", "DIS", "NFLX", "T", "VZ", "CMCSA", "CHTR", "PARA", "FOX",
        "SPOT", "SNAP", "PINS", "RDDT", "IAC", "ZM", "TTWO", "EA", "ATVI", "NTES",
    ],
    "Real Estate": [
        "AMT", "PLD", "CCI", "EQIX", "PSA", "EQR", "AvB", "VTR", "WELL", "DLR",
        "O", "SPG", "BXP", "SLG", "KIM", "REG", "FRT", "NNN", "MPW", "COLD",
    ],
    "Clean Energy": [
        "NEE", "FSLR", "ENPH", "SEDG", "RUN", "PLUG", "BE", "CHPT", "BLDP", "FCEL",
        "NOVA", "ARRY", "MAXN", "SHLS", "STEM", "CWEN", "AES", "BEP", "HASI", "ICLN",
    ],
    "Crypto & Fintech": [
        "COIN", "MSTR", "RIOT", "MARA", "CLSK", "SQ", "PYPL", "SOFI", "UPST", "AFRM",
        "HOOD", "NU", "PAGS", "STNE", "FLUT", "WU", "MQ", "FOUR", "DLO", "RPAY",
    ],
}

# Flat list of all unique tickers (for "all sectors" runs)
STOCK_UNIVERSE = list(dict.fromkeys(
    ticker for tickers in SECTORS.values() for ticker in tickers
))

# Sector lookup: ticker → sector
TICKER_SECTOR: dict[str, str] = {
    ticker: sector
    for sector, tickers in SECTORS.items()
    for ticker in tickers
}

COMPANY_NAMES = {
    # Technology
    "AAPL": "Apple Inc.", "MSFT": "Microsoft Corp.", "NVDA": "NVIDIA Corp.",
    "AMD": "Advanced Micro Devices", "AVGO": "Broadcom Inc.", "QCOM": "Qualcomm Inc.",
    "INTC": "Intel Corp.", "TXN": "Texas Instruments", "MU": "Micron Technology",
    "AMAT": "Applied Materials", "LRCX": "Lam Research", "KLAC": "KLA Corp.",
    "ASML": "ASML Holding", "SNPS": "Synopsys Inc.", "CDNS": "Cadence Design",
    # Software & Cloud
    "CRM": "Salesforce Inc.", "ADBE": "Adobe Inc.", "NOW": "ServiceNow",
    "ORCL": "Oracle Corp.", "WDAY": "Workday Inc.", "DDOG": "Datadog Inc.",
    "SNOW": "Snowflake Inc.", "NET": "Cloudflare Inc.", "ZS": "Zscaler Inc.",
    "CRWD": "CrowdStrike Holdings", "PANW": "Palo Alto Networks", "OKTA": "Okta Inc.",
    "TEAM": "Atlassian Corp.", "MDB": "MongoDB Inc.", "GTLB": "GitLab Inc.",
    "HUBS": "HubSpot Inc.", "VEEV": "Veeva Systems", "SMAR": "Smartsheet Inc.",
    "DOCN": "DigitalOcean",
    # Healthcare & Pharma
    "LLY": "Eli Lilly", "JNJ": "Johnson & Johnson", "MRK": "Merck & Co.",
    "PFE": "Pfizer Inc.", "ABBV": "AbbVie Inc.", "BMY": "Bristol-Myers Squibb",
    "AMGN": "Amgen Inc.", "GILD": "Gilead Sciences", "REGN": "Regeneron Pharma",
    "VRTX": "Vertex Pharmaceuticals", "BIIB": "Biogen Inc.", "MRNA": "Moderna Inc.",
    "ALNY": "Alnylam Pharma", "INCY": "Incyte Corp.", "EXAS": "Exact Sciences",
    "ILMN": "Illumina Inc.", "DXCM": "DexCom Inc.", "HOLX": "Hologic Inc.",
    "PODD": "Insulet Corp.", "ACAD": "ACADIA Pharma",
    # Medical Devices
    "MDT": "Medtronic", "ABT": "Abbott Labs", "TMO": "Thermo Fisher",
    "DHR": "Danaher Corp.", "BSX": "Boston Scientific", "SYK": "Stryker Corp.",
    "ISRG": "Intuitive Surgical", "EW": "Edwards Lifesciences", "ZBH": "Zimmer Biomet",
    "BDX": "Becton Dickinson", "BAX": "Baxter Intl.", "RMD": "ResMed Inc.",
    "ALGN": "Align Technology", "NVCR": "NovaCure Ltd.", "SWAV": "ShockWave Medical",
    "TNDM": "Tandem Diabetes", "AXNX": "Axonics Inc.", "NTRA": "Natera Inc.",
    "GRFS": "Grifols SA", "IRTC": "iRhythm Technologies",
    # Banks & Financials
    "JPM": "JPMorgan Chase", "BAC": "Bank of America", "WFC": "Wells Fargo",
    "GS": "Goldman Sachs", "MS": "Morgan Stanley", "C": "Citigroup Inc.",
    "USB": "U.S. Bancorp", "PNC": "PNC Financial", "TFC": "Truist Financial",
    "CFG": "Citizens Financial", "FITB": "Fifth Third Bancorp", "HBAN": "Huntington Bancshares",
    "KEY": "KeyCorp", "RF": "Regions Financial", "MTB": "M&T Bank",
    "CMA": "Comerica Inc.", "ZION": "Zions Bancorporation", "SIVB": "SVB Financial",
    "FRC": "First Republic Bank", "WAL": "Western Alliance",
    # Insurance & Asset Mgmt
    "BLK": "BlackRock Inc.", "SCHW": "Charles Schwab", "AXP": "American Express",
    "V": "Visa Inc.", "MA": "Mastercard Inc.", "SPGI": "S&P Global Inc.",
    "MCO": "Moody's Corp.", "ICE": "Intercontinental Exchange", "CME": "CME Group",
    "CBOE": "Cboe Global Markets", "PGR": "Progressive Corp.", "TRV": "Travelers Cos.",
    "MET": "MetLife Inc.", "PRU": "Prudential Financial", "AFL": "Aflac Inc.",
    "ALL": "Allstate Corp.", "HIG": "Hartford Financial", "LNC": "Lincoln National",
    "AIG": "American Intl. Group", "RGA": "Reinsurance Group",
    # Energy & Oil
    "XOM": "Exxon Mobil", "CVX": "Chevron Corp.", "COP": "ConocoPhillips",
    "EOG": "EOG Resources", "PXD": "Pioneer Natural Resources", "OXY": "Occidental Petroleum",
    "DVN": "Devon Energy", "FANG": "Diamondback Energy", "MRO": "Marathon Oil",
    "APA": "APA Corp.", "HES": "Hess Corp.", "PSX": "Phillips 66",
    "MPC": "Marathon Petroleum", "VLO": "Valero Energy", "PBF": "PBF Energy",
    "SLB": "SLB (Schlumberger)", "HAL": "Halliburton Co.", "BKR": "Baker Hughes",
    "FTI": "TechnipFMC", "NOV": "NOV Inc.",
    # Consumer Discretionary
    "AMZN": "Amazon.com Inc.", "TSLA": "Tesla Inc.", "HD": "Home Depot",
    "MCD": "McDonald's Corp.", "NKE": "Nike Inc.", "SBUX": "Starbucks Corp.",
    "TJX": "TJX Companies", "BKNG": "Booking Holdings", "CMG": "Chipotle Mexican Grill",
    "YUM": "Yum! Brands", "ROST": "Ross Stores", "DG": "Dollar General",
    "DLTR": "Dollar Tree", "BBY": "Best Buy", "ETSY": "Etsy Inc.",
    "RH": "RH (Restoration Hardware)", "LULU": "Lululemon Athletica",
    "CPRI": "Capri Holdings", "TPR": "Tapestry Inc.", "PVH": "PVH Corp.",
    # Consumer Staples
    "PG": "Procter & Gamble", "KO": "Coca-Cola Co.", "PEP": "PepsiCo Inc.",
    "WMT": "Walmart Inc.", "COST": "Costco Wholesale", "MDLZ": "Mondelez Intl.",
    "CL": "Colgate-Palmolive", "KMB": "Kimberly-Clark", "GIS": "General Mills",
    "K": "Kellanova", "SJM": "J.M. Smucker", "HRL": "Hormel Foods",
    "CAG": "Conagra Brands", "CPB": "Campbell Soup", "MKC": "McCormick & Co.",
    "CLX": "Clorox Co.", "CHD": "Church & Dwight", "EL": "Estee Lauder",
    "COTY": "Coty Inc.", "SPB": "Spectrum Brands",
    # Industrials
    "CAT": "Caterpillar Inc.", "DE": "Deere & Co.", "HON": "Honeywell Intl.",
    "GE": "GE Aerospace", "MMM": "3M Co.", "RTX": "RTX Corp.",
    "LMT": "Lockheed Martin", "NOC": "Northrop Grumman", "BA": "Boeing Co.",
    "GD": "General Dynamics", "UPS": "United Parcel Service", "FDX": "FedEx Corp.",
    "UNP": "Union Pacific", "CSX": "CSX Corp.", "NSC": "Norfolk Southern",
    "EMR": "Emerson Electric", "ETN": "Eaton Corp.", "PH": "Parker Hannifin",
    "ROK": "Rockwell Automation", "AME": "AMETEK Inc.",
    # Communication & Media
    "GOOGL": "Alphabet Inc.", "META": "Meta Platforms Inc.", "DIS": "Walt Disney Co.",
    "NFLX": "Netflix Inc.", "T": "AT&T Inc.", "VZ": "Verizon Communications",
    "CMCSA": "Comcast Corp.", "CHTR": "Charter Communications", "PARA": "Paramount Global",
    "FOX": "Fox Corp.", "SPOT": "Spotify Technology", "SNAP": "Snap Inc.",
    "PINS": "Pinterest Inc.", "RDDT": "Reddit Inc.", "IAC": "IAC Inc.",
    "ZM": "Zoom Video", "TTWO": "Take-Two Interactive", "EA": "Electronic Arts",
    "ATVI": "Activision Blizzard", "NTES": "NetEase Inc.",
    # Real Estate
    "AMT": "American Tower", "PLD": "Prologis Inc.", "CCI": "Crown Castle",
    "EQIX": "Equinix Inc.", "PSA": "Public Storage", "EQR": "Equity Residential",
    "AvB": "AvalonBay Communities", "VTR": "Ventas Inc.", "WELL": "Welltower Inc.",
    "DLR": "Digital Realty", "O": "Realty Income", "SPG": "Simon Property Group",
    "BXP": "Boston Properties", "SLG": "SL Green Realty", "KIM": "Kimco Realty",
    "REG": "Regency Centers", "FRT": "Federal Realty", "NNN": "NNN REIT",
    "MPW": "Medical Properties", "COLD": "Americold Realty",
    # Clean Energy
    "NEE": "NextEra Energy", "FSLR": "First Solar", "ENPH": "Enphase Energy",
    "SEDG": "SolarEdge Technologies", "RUN": "Sunrun Inc.", "PLUG": "Plug Power",
    "BE": "Bloom Energy", "CHPT": "ChargePoint Holdings", "BLDP": "Ballard Power",
    "FCEL": "FuelCell Energy", "NOVA": "Sunnova Energy", "ARRY": "Array Technologies",
    "MAXN": "Maxeon Solar", "SHLS": "Shoals Technologies", "STEM": "Stem Inc.",
    "CWEN": "Clearway Energy", "AES": "AES Corp.", "BEP": "Brookfield Renewable",
    "HASI": "Hannon Armstrong", "ICLN": "iShares Clean Energy ETF",
    # Crypto & Fintech
    "COIN": "Coinbase Global", "MSTR": "MicroStrategy", "RIOT": "Riot Platforms",
    "MARA": "Marathon Digital", "CLSK": "CleanSpark Inc.", "SQ": "Block Inc.",
    "PYPL": "PayPal Holdings", "SOFI": "SoFi Technologies", "UPST": "Upstart Holdings",
    "AFRM": "Affirm Holdings", "HOOD": "Robinhood Markets", "NU": "Nu Holdings",
    "PAGS": "PagSeguro Digital", "STNE": "StoneCo Ltd.", "FLUT": "Flutter Entertainment",
    "WU": "Western Union", "MQ": "Marqeta Inc.", "FOUR": "Shift4 Payments",
    "DLO": "DLocal Ltd.", "RPAY": "Repay Holdings",
    # IBM already in Technology above
    "IBM": "IBM Corp.",
}
