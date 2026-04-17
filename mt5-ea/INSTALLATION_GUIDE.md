# UltraTraderBot — MT5 Expert Advisor
## Installation & Setup Guide

---

## STEP 1: Copy the EA File into MetaTrader 5

1. Open **MetaTrader 5**
2. Click the top menu: **File → Open Data Folder**
3. Inside that folder, navigate to: `MQL5 → Experts`
4. **Copy `UltraTraderBot.mq5` into that Experts folder**
5. Go back to MT5, open **Navigator** panel (Ctrl+N)
6. Right-click **Expert Advisors** → click **Refresh**
7. You will now see **UltraTraderBot** in the list

---

## STEP 2: Compile the EA

1. Double-click **UltraTraderBot** in the Navigator
2. This opens the **MetaEditor**
3. Press **F7** (or click the green Compile button)
4. You should see **0 errors, 0 warnings** at the bottom
5. Close MetaEditor and return to MT5

---

## STEP 3: Attach to a Chart

1. Open a chart for your preferred symbol:
   - Forex: **EURUSD, GBPUSD, USDJPY, USDCHF, USDZAR**, etc.
   - Gold: **XAUUSD**
   - Crypto: **BTCUSD, ETHUSD**
   - Indices: **US30, NAS100, GER40**, etc.
2. Set the chart timeframe (e.g. H1, H4, M15)
3. Drag **UltraTraderBot** from the Navigator onto the chart
4. The **Inputs** settings window will appear

---

## STEP 4: Configure the Settings

When you attach the EA, you will see all settings organized into sections:

### GENERAL SETTINGS
| Setting | Default | Explanation |
|---|---|---|
| Trading Strategy | Combined Multi-Signal | Choose your strategy (see below) |
| Magic Number | 202400 | Unique ID — change if running multiple EAs |
| Trade Comment | UltraTraderBot | Label shown on trades |
| Trade on New Bar Only | true | Only checks signals when a new candle opens |
| Strategy Timeframe | H1 | Timeframe used for indicator calculations |

### STRATEGY OPTIONS
| Strategy | How it works |
|---|---|
| **Moving Average Crossover** | Buys when fast MA crosses above slow MA; sells on crossover below |
| **RSI Overbought/Oversold** | Buys when RSI bounces from oversold; sells when RSI falls from overbought |
| **MACD Signal Crossover** | Buys when MACD line crosses above signal line; sells on cross below |
| **Bollinger Bands Breakout** | Buys on bounce from lower band; sells on bounce from upper band |
| **Combined Multi-Signal** | Requires 2 out of 3 (MA + RSI + MACD) to agree — most reliable |

### TRADE DIRECTION
- **Both** — opens Buy and Sell trades
- **Buy Only** — only buys (useful in trending bull markets)
- **Sell Only** — only sells (useful in trending bear markets)

### RISK MANAGEMENT
| Setting | Default | Explanation |
|---|---|---|
| Lot Size Mode | % of Balance | How to calculate position size |
| Fixed Lot Size | 0.01 | Used only if you select Fixed mode |
| Risk % of Balance | 1.5% | Risked per trade in % mode |
| Fixed Dollar Risk | $50 | Risked per trade in Dollar mode |
| Stop Loss (Pips) | 30 | Distance to stop-loss in pips |
| Take Profit (Pips) | 60 | Distance to take-profit in pips |
| Use Trailing Stop | true | Moves SL as trade profits |
| Trailing Pips | 20 | How far SL trails price |
| Use Break-Even | true | Moves SL to entry when in profit |
| Break-Even Trigger | 15 pips | Profit needed to trigger break-even |

### SESSION FILTER
| Option | Hours (GMT) |
|---|---|
| All Sessions | Always trading |
| London Only | 08:00 – 17:00 |
| New York Only | 13:00 – 22:00 |
| Tokyo Only | 00:00 – 09:00 |
| London/NY Overlap | 13:00 – 17:00 (highest volatility) |
| Custom Hours | Set your own start/end hour |

### POSITION LIMITS
- **Max Open Positions**: 3 — EA won't open more than 3 trades at once
- **Max Buys / Sells**: Separate limits for each direction
- **One Trade Per Bar**: Prevents multiple trades on the same candle

### DAILY PROFIT / LOSS LIMITS
- **Daily Profit Limit**: EA stops trading for the day after reaching $X profit
- **Daily Loss Limit**: EA stops trading for the day after reaching $X loss
- Automatically resets the next trading day

### SPREAD FILTER
- **Max Spread**: EA skips trading when broker spread is too wide (protects against high-spread periods)

---

## STEP 5: Enable AutoTrading

1. Make sure **AutoTrading** is ON in MT5 (button in toolbar, turns green)
2. In the EA settings window, go to the **Common** tab:
   - ✅ Allow live trading
   - ✅ Allow DLL imports (if needed)
3. Click **OK**

The EA is now running. You'll see a smiley face `:)` in the top-right corner of the chart when it's active.

---

## RECOMMENDED SETTINGS BY MARKET

### Forex (EURUSD, GBPUSD, etc.)
- Strategy: Combined Multi-Signal
- Timeframe: H1 or H4
- SL: 30 pips | TP: 60 pips
- Session: London or London/NY Overlap
- Risk: 1-2% of balance

### Gold (XAUUSD)
- Strategy: MA Crossover or MACD
- Timeframe: H1 or H4
- SL: 150 pips | TP: 300 pips (Gold moves in larger pip ranges)
- Session: London/NY Overlap
- Risk: 1% of balance
- Max Spread: 10 pips

### Crypto (BTCUSD, ETHUSD)
- Strategy: Bollinger Bands or RSI
- Timeframe: H4 or D1
- SL: 500+ pips | TP: 1000+ pips (Crypto has very wide ranges)
- Session: All Sessions (crypto trades 24/7)
- Risk: 0.5-1% of balance
- Max Spread: 50+ pips

### Indices (US30, NAS100)
- Strategy: MA Crossover or Combined
- Timeframe: M15 or H1
- SL: 50-100 pips | TP: 100-200 pips
- Session: New York Session
- Risk: 1% of balance

---

## RUNNING ON MULTIPLE PAIRS AT ONCE

You can run the EA on multiple charts simultaneously:
1. Attach it to a second chart with a different symbol
2. **IMPORTANT**: Change the **Magic Number** for each chart (e.g. 202401, 202402...)
3. Each chart will trade independently

---

## TESTING BEFORE GOING LIVE

It is strongly recommended to test first:
1. Open **Strategy Tester** (Ctrl+R)
2. Select **UltraTraderBot** from the EA dropdown
3. Set Symbol, Date Range, and Timeframe
4. Run in **Visual Mode** to watch trades being placed
5. Check the **Report** tab for performance stats

---

## NOTES
- This EA works with any MT5 broker (Just Markets, RCG Markets, XM, etc.)
- Always test on a **Demo Account** before using real money
- Past performance does not guarantee future results
- Use the Risk Management settings wisely — never risk more than 1-2% per trade
