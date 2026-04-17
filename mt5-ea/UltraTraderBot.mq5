//+------------------------------------------------------------------+
//|                                              UltraTraderBot.mq5  |
//|                         Professional Multi-Strategy EA for MT5   |
//|                    Works on Forex, Gold, Crypto, Indices         |
//+------------------------------------------------------------------+
#property copyright   "UltraTraderBot"
#property link        ""
#property version     "2.00"
#property description "Multi-strategy Expert Advisor. Configure all settings from the Inputs panel."
#property strict

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\AccountInfo.mqh>

//+------------------------------------------------------------------+
//| STRATEGY SELECTION                                               |
//+------------------------------------------------------------------+
enum ENUM_STRATEGY
  {
   STRATEGY_MA_CROSSOVER    = 0,  // Moving Average Crossover
   STRATEGY_RSI             = 1,  // RSI Overbought / Oversold
   STRATEGY_MACD            = 2,  // MACD Signal Crossover
   STRATEGY_BOLLINGER       = 3,  // Bollinger Bands Breakout
   STRATEGY_COMBINED        = 4,  // Combined Multi-Signal (MA + RSI + MACD)
  };

//+------------------------------------------------------------------+
//| LOT SIZE / RISK MODE                                             |
//+------------------------------------------------------------------+
enum ENUM_LOT_MODE
  {
   LOT_FIXED         = 0,  // Fixed Lot Size
   LOT_PERCENT_BAL   = 1,  // % of Account Balance
   LOT_FIXED_DOLLAR  = 2,  // Fixed Dollar Risk per Trade
  };

//+------------------------------------------------------------------+
//| TRADE DIRECTION FILTER                                           |
//+------------------------------------------------------------------+
enum ENUM_DIRECTION_FILTER
  {
   DIR_BOTH  = 0,  // Both Buy and Sell
   DIR_BUY   = 1,  // Buy Only
   DIR_SELL  = 2,  // Sell Only
  };

//+------------------------------------------------------------------+
//| SESSION FILTER                                                   |
//+------------------------------------------------------------------+
enum ENUM_SESSION
  {
   SESSION_ALL     = 0,  // Trade All Sessions
   SESSION_LONDON  = 1,  // London Session Only  (08:00-17:00 GMT)
   SESSION_NY      = 2,  // New York Session Only (13:00-22:00 GMT)
   SESSION_TOKYO   = 3,  // Tokyo Session Only   (00:00-09:00 GMT)
   SESSION_OVERLAP = 4,  // London/NY Overlap    (13:00-17:00 GMT)
  };

//+------------------------------------------------------------------+
//| INPUT PARAMETERS                                                 |
//+------------------------------------------------------------------+

// --- General ---
input group "=== GENERAL SETTINGS ==="
input ENUM_STRATEGY  InpStrategy         = STRATEGY_COMBINED; // Trading Strategy
input int            InpMagicNumber      = 202400;            // Magic Number (unique EA ID)
input string         InpTradeComment     = "UltraTraderBot";  // Trade Comment
input bool           InpTradeOnNewBar    = true;              // Trade on New Bar Only
input ENUM_TIMEFRAMES InpTimeframe       = PERIOD_H1;         // Strategy Timeframe

// --- Trade Direction ---
input group "=== TRADE DIRECTION ==="
input ENUM_DIRECTION_FILTER InpDirection = DIR_BOTH; // Trade Direction Filter

// --- Lot Size / Risk Management ---
input group "=== RISK MANAGEMENT ==="
input ENUM_LOT_MODE  InpLotMode          = LOT_PERCENT_BAL;  // Lot Size Mode
input double         InpFixedLot         = 0.01;             // Fixed Lot Size (if Fixed mode)
input double         InpRiskPercent      = 1.5;              // Risk % of Balance per Trade
input double         InpFixedDollarRisk  = 50.0;             // Fixed Dollar Risk per Trade ($)
input double         InpStopLossPips     = 30.0;             // Stop Loss (Pips)
input double         InpTakeProfitPips   = 60.0;             // Take Profit (Pips)
input bool           InpUseTrailingStop  = true;             // Use Trailing Stop
input double         InpTrailingPips     = 20.0;             // Trailing Stop (Pips)
input double         InpTrailingStep     = 5.0;              // Trailing Step (Pips)
input bool           InpUseBreakEven     = true;             // Use Break-Even
input double         InpBreakEvenPips    = 15.0;             // Break-Even Trigger (Pips in profit)

// --- Moving Average Settings ---
input group "=== MOVING AVERAGE SETTINGS ==="
input int            InpFastMAPeriod     = 20;               // Fast MA Period
input int            InpSlowMAPeriod     = 50;               // Slow MA Period
input int            InpTrendMAPeriod    = 200;              // Trend Filter MA Period
input ENUM_MA_METHOD InpMAMethod         = MODE_EMA;         // MA Method
input ENUM_APPLIED_PRICE InpMAPrice      = PRICE_CLOSE;      // MA Applied Price
input bool           InpUseTrendFilter   = true;             // Use 200 MA Trend Filter

// --- RSI Settings ---
input group "=== RSI SETTINGS ==="
input int            InpRSIPeriod        = 14;               // RSI Period
input double         InpRSIOverbought    = 70.0;             // RSI Overbought Level
input double         InpRSIOversold      = 30.0;             // RSI Oversold Level
input ENUM_APPLIED_PRICE InpRSIPrice     = PRICE_CLOSE;      // RSI Applied Price

// --- MACD Settings ---
input group "=== MACD SETTINGS ==="
input int            InpMACDFastEMA      = 12;               // MACD Fast EMA
input int            InpMACDSlowEMA      = 26;               // MACD Slow EMA
input int            InpMACDSignal       = 9;                // MACD Signal Period
input ENUM_APPLIED_PRICE InpMACDPrice    = PRICE_CLOSE;      // MACD Applied Price

// --- Bollinger Bands Settings ---
input group "=== BOLLINGER BANDS SETTINGS ==="
input int            InpBBPeriod         = 20;               // BB Period
input double         InpBBDeviation      = 2.0;              // BB Deviation
input ENUM_APPLIED_PRICE InpBBPrice      = PRICE_CLOSE;      // BB Applied Price

// --- Session Filter ---
input group "=== SESSION / TIME FILTER ==="
input ENUM_SESSION   InpSession          = SESSION_ALL;      // Session Filter
input bool           InpUseCustomHours   = false;            // Use Custom Trading Hours
input int            InpStartHour        = 8;                // Custom Start Hour (server time)
input int            InpEndHour          = 20;               // Custom End Hour (server time)
input bool           InpAvoidNewsTime    = false;            // Avoid Trading Friday 21:00+
input bool           InpNoTradeMonday    = false;            // No Trades on Monday (open)
input bool           InpNoTradeFriday    = false;            // No Trades on Friday (close)

// --- Max Open Positions ---
input group "=== POSITION LIMITS ==="
input int            InpMaxPositions     = 3;                // Max Open Positions (this EA)
input int            InpMaxBuys          = 2;                // Max Buy Positions
input int            InpMaxSells         = 2;                // Max Sell Positions
input bool           InpOneTradePerBar   = true;             // Only 1 Trade Per Bar

// --- Daily Limits ---
input group "=== DAILY PROFIT / LOSS LIMITS ==="
input bool           InpUseDailyProfitLimit = true;          // Use Daily Profit Limit
input double         InpDailyProfitLimit    = 200.0;         // Daily Profit Limit ($)
input bool           InpUseDailyLossLimit   = true;          // Use Daily Loss Limit
input double         InpDailyLossLimit      = 100.0;         // Daily Loss Limit ($)

// --- Spread Filter ---
input group "=== SPREAD FILTER ==="
input bool           InpUseSpreadFilter  = true;             // Use Spread Filter
input double         InpMaxSpreadPips    = 5.0;              // Max Allowed Spread (Pips)

//+------------------------------------------------------------------+
//| GLOBAL VARIABLES                                                 |
//+------------------------------------------------------------------+
CTrade          Trade;
CPositionInfo   PositionInfo;
CAccountInfo    AccountInfo;

int    handleFastMA    = INVALID_HANDLE;
int    handleSlowMA    = INVALID_HANDLE;
int    handleTrendMA   = INVALID_HANDLE;
int    handleRSI       = INVALID_HANDLE;
int    handleMACD      = INVALID_HANDLE;
int    handleBB        = INVALID_HANDLE;

datetime lastBarTime   = 0;
datetime lastTradeBar  = 0;
double   dailyProfit   = 0.0;
double   dailyLoss     = 0.0;
datetime dayStart      = 0;

double   Point_         = 0.0;
int      Digits_        = 5;
double   PipValue       = 0.0001;

//+------------------------------------------------------------------+
//| EXPERT INITIALIZATION                                            |
//+------------------------------------------------------------------+
int OnInit()
  {
   Trade.SetExpertMagicNumber(InpMagicNumber);
   Trade.SetDeviationInPoints(30);
   Trade.SetTypeFilling(ORDER_FILLING_FOK);

   Point_  = _Point;
   Digits_ = _Digits;

   // Detect pip size (5-digit brokers)
   if(Digits_ == 3 || Digits_ == 5)
      PipValue = Point_ * 10;
   else
      PipValue = Point_;

   // Create indicator handles
   handleFastMA  = iMA(_Symbol, InpTimeframe, InpFastMAPeriod,  0, InpMAMethod, InpMAPrice);
   handleSlowMA  = iMA(_Symbol, InpTimeframe, InpSlowMAPeriod,  0, InpMAMethod, InpMAPrice);
   handleTrendMA = iMA(_Symbol, InpTimeframe, InpTrendMAPeriod, 0, MODE_EMA,    InpMAPrice);
   handleRSI     = iRSI(_Symbol, InpTimeframe, InpRSIPeriod, InpRSIPrice);
   handleMACD    = iMACD(_Symbol, InpTimeframe, InpMACDFastEMA, InpMACDSlowEMA, InpMACDSignal, InpMACDPrice);
   handleBB      = iBands(_Symbol, InpTimeframe, InpBBPeriod, 0, InpBBDeviation, InpBBPrice);

   if(handleFastMA == INVALID_HANDLE || handleSlowMA == INVALID_HANDLE ||
      handleTrendMA == INVALID_HANDLE || handleRSI == INVALID_HANDLE ||
      handleMACD == INVALID_HANDLE || handleBB == INVALID_HANDLE)
     {
      Print("ERROR: Failed to create indicator handles. Check symbol/timeframe.");
      return(INIT_FAILED);
     }

   Print("UltraTraderBot initialized. Strategy: ", EnumToString(InpStrategy),
         " | Symbol: ", _Symbol, " | Magic: ", InpMagicNumber);
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| EXPERT DEINITIALIZATION                                          |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   IndicatorRelease(handleFastMA);
   IndicatorRelease(handleSlowMA);
   IndicatorRelease(handleTrendMA);
   IndicatorRelease(handleRSI);
   IndicatorRelease(handleMACD);
   IndicatorRelease(handleBB);
  }

//+------------------------------------------------------------------+
//| EXPERT TICK FUNCTION                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   // New bar check
   datetime currentBar = iTime(_Symbol, InpTimeframe, 0);
   bool isNewBar = (currentBar != lastBarTime);
   if(isNewBar) lastBarTime = currentBar;

   if(InpTradeOnNewBar && !isNewBar)
     {
      // Still manage open trades on every tick
      ManageOpenTrades();
      return;
     }

   // Daily reset
   ResetDailyStats();

   // Daily P&L limits check
   if(!CheckDailyLimits()) { ManageOpenTrades(); return; }

   // Session filter
   if(!IsSessionAllowed()) { ManageOpenTrades(); return; }

   // Spread filter
   if(InpUseSpreadFilter && !IsSpreadOK()) { ManageOpenTrades(); return; }

   // Day filter
   if(!IsDayAllowed()) { ManageOpenTrades(); return; }

   // Position limits
   int totalPositions = CountMyPositions();
   int buyCount       = CountMyPositions(ORDER_TYPE_BUY);
   int sellCount      = CountMyPositions(ORDER_TYPE_SELL);

   // One trade per bar
   if(InpOneTradePerBar && lastTradeBar == currentBar) { ManageOpenTrades(); return; }

   // Get signals
   int signal = GetSignal();

   // Open trades
   if(signal == 1 && InpDirection != DIR_SELL && totalPositions < InpMaxPositions && buyCount < InpMaxBuys)
     {
      double lot = CalculateLotSize();
      if(lot > 0) OpenTrade(ORDER_TYPE_BUY, lot);
      lastTradeBar = currentBar;
     }
   else if(signal == -1 && InpDirection != DIR_BUY && totalPositions < InpMaxPositions && sellCount < InpMaxSells)
     {
      double lot = CalculateLotSize();
      if(lot > 0) OpenTrade(ORDER_TYPE_SELL, lot);
      lastTradeBar = currentBar;
     }

   ManageOpenTrades();
  }

//+------------------------------------------------------------------+
//| GET SIGNAL FROM SELECTED STRATEGY                                |
//+------------------------------------------------------------------+
int GetSignal()
  {
   switch(InpStrategy)
     {
      case STRATEGY_MA_CROSSOVER: return SignalMACrossover();
      case STRATEGY_RSI:          return SignalRSI();
      case STRATEGY_MACD:         return SignalMACD();
      case STRATEGY_BOLLINGER:    return SignalBollinger();
      case STRATEGY_COMBINED:     return SignalCombined();
      default:                    return 0;
     }
  }

//+------------------------------------------------------------------+
//| STRATEGY: MOVING AVERAGE CROSSOVER                               |
//+------------------------------------------------------------------+
int SignalMACrossover()
  {
   double fastMA[3], slowMA[3], trendMA[3];

   if(CopyBuffer(handleFastMA,  0, 0, 3, fastMA)  < 3) return 0;
   if(CopyBuffer(handleSlowMA,  0, 0, 3, slowMA)  < 3) return 0;
   if(CopyBuffer(handleTrendMA, 0, 0, 3, trendMA) < 3) return 0;

   ArraySetAsSeries(fastMA,  true);
   ArraySetAsSeries(slowMA,  true);
   ArraySetAsSeries(trendMA, true);

   bool crossUp   = (fastMA[1] <= slowMA[1]) && (fastMA[0] >  slowMA[0]);
   bool crossDown = (fastMA[1] >= slowMA[1]) && (fastMA[0] <  slowMA[0]);

   double price = SymbolInfoDouble(_Symbol, SYMBOL_BID);

   if(InpUseTrendFilter)
     {
      if(crossUp   && price > trendMA[0]) return 1;
      if(crossDown && price < trendMA[0]) return -1;
     }
   else
     {
      if(crossUp)   return 1;
      if(crossDown) return -1;
     }

   return 0;
  }

//+------------------------------------------------------------------+
//| STRATEGY: RSI OVERBOUGHT / OVERSOLD                              |
//+------------------------------------------------------------------+
int SignalRSI()
  {
   double rsi[3];
   if(CopyBuffer(handleRSI, 0, 0, 3, rsi) < 3) return 0;
   ArraySetAsSeries(rsi, true);

   // Buy when RSI crosses back above oversold
   if(rsi[1] < InpRSIOversold && rsi[0] >= InpRSIOversold) return 1;
   // Sell when RSI crosses back below overbought
   if(rsi[1] > InpRSIOverbought && rsi[0] <= InpRSIOverbought) return -1;

   return 0;
  }

//+------------------------------------------------------------------+
//| STRATEGY: MACD SIGNAL CROSSOVER                                  |
//+------------------------------------------------------------------+
int SignalMACD()
  {
   double macdMain[3], macdSignal[3];
   if(CopyBuffer(handleMACD, 0, 0, 3, macdMain)   < 3) return 0;
   if(CopyBuffer(handleMACD, 1, 0, 3, macdSignal) < 3) return 0;

   ArraySetAsSeries(macdMain,   true);
   ArraySetAsSeries(macdSignal, true);

   bool crossUp   = (macdMain[1] <= macdSignal[1]) && (macdMain[0] >  macdSignal[0]);
   bool crossDown = (macdMain[1] >= macdSignal[1]) && (macdMain[0] <  macdSignal[0]);

   if(crossUp)   return 1;
   if(crossDown) return -1;

   return 0;
  }

//+------------------------------------------------------------------+
//| STRATEGY: BOLLINGER BANDS BREAKOUT                               |
//+------------------------------------------------------------------+
int SignalBollinger()
  {
   double bbUpper[2], bbLower[2], bbMiddle[2];
   if(CopyBuffer(handleBB, 1, 0, 2, bbUpper)  < 2) return 0;
   if(CopyBuffer(handleBB, 2, 0, 2, bbLower)  < 2) return 0;
   if(CopyBuffer(handleBB, 0, 0, 2, bbMiddle) < 2) return 0;

   ArraySetAsSeries(bbUpper,  true);
   ArraySetAsSeries(bbLower,  true);
   ArraySetAsSeries(bbMiddle, true);

   double closeArr[2];
   if(CopyClose(_Symbol, InpTimeframe, 0, 2, closeArr) < 2) return 0;
   ArraySetAsSeries(closeArr, true);

   // Buy: previous candle closed below lower band, current close above lower band
   if(closeArr[1] < bbLower[1] && closeArr[0] > bbLower[0]) return 1;
   // Sell: previous candle closed above upper band, current close below upper band
   if(closeArr[1] > bbUpper[1] && closeArr[0] < bbUpper[0]) return -1;

   return 0;
  }

//+------------------------------------------------------------------+
//| STRATEGY: COMBINED (MA + RSI + MACD confirmation)               |
//+------------------------------------------------------------------+
int SignalCombined()
  {
   int maSignal   = SignalMACrossover();
   int rsiSignal  = SignalRSI();
   int macdSignal = SignalMACD();

   // Require at least 2 out of 3 signals to agree
   int buyVotes  = (maSignal == 1 ? 1 : 0) + (rsiSignal == 1 ? 1 : 0) + (macdSignal == 1 ? 1 : 0);
   int sellVotes = (maSignal == -1 ? 1 : 0) + (rsiSignal == -1 ? 1 : 0) + (macdSignal == -1 ? 1 : 0);

   if(buyVotes >= 2)  return 1;
   if(sellVotes >= 2) return -1;

   return 0;
  }

//+------------------------------------------------------------------+
//| OPEN A TRADE                                                     |
//+------------------------------------------------------------------+
void OpenTrade(ENUM_ORDER_TYPE type, double lot)
  {
   double ask  = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid  = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double sl   = 0.0, tp = 0.0;
   double price = (type == ORDER_TYPE_BUY) ? ask : bid;
   double slPips = InpStopLossPips  * PipValue;
   double tpPips = InpTakeProfitPips * PipValue;

   if(type == ORDER_TYPE_BUY)
     {
      if(InpStopLossPips  > 0) sl = NormalizeDouble(price - slPips, Digits_);
      if(InpTakeProfitPips > 0) tp = NormalizeDouble(price + tpPips, Digits_);
     }
   else
     {
      if(InpStopLossPips  > 0) sl = NormalizeDouble(price + slPips, Digits_);
      if(InpTakeProfitPips > 0) tp = NormalizeDouble(price - tpPips, Digits_);
     }

   // Validate SL/TP against broker's minimum stop level
   int stopLevel = (int)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL);
   double minStopDist = stopLevel * Point_;
   if(type == ORDER_TYPE_BUY)
     {
      if(sl > 0 && (price - sl) < minStopDist) sl = NormalizeDouble(price - minStopDist, Digits_);
      if(tp > 0 && (tp - price) < minStopDist) tp = NormalizeDouble(price + minStopDist, Digits_);
     }
   else
     {
      if(sl > 0 && (sl - price) < minStopDist) sl = NormalizeDouble(price + minStopDist, Digits_);
      if(tp > 0 && (price - tp) < minStopDist) tp = NormalizeDouble(price - minStopDist, Digits_);
     }

   lot = NormalizeLot(lot);
   if(lot <= 0) return;

   bool result = false;
   if(type == ORDER_TYPE_BUY)
      result = Trade.Buy(lot, _Symbol, 0, sl, tp, InpTradeComment);
   else
      result = Trade.Sell(lot, _Symbol, 0, sl, tp, InpTradeComment);

   if(!result)
      Print("Trade open failed. Error: ", GetLastError(), " RetCode: ", Trade.ResultRetcode());
   else
      Print("Trade opened: ", EnumToString(type), " | Lot: ", lot, " | SL: ", sl, " | TP: ", tp);
  }

//+------------------------------------------------------------------+
//| MANAGE OPEN TRADES (Trailing Stop, Break-Even)                  |
//+------------------------------------------------------------------+
void ManageOpenTrades()
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(!PositionInfo.SelectByIndex(i)) continue;
      if(PositionInfo.Symbol() != _Symbol) continue;
      if(PositionInfo.Magic()  != InpMagicNumber) continue;

      double openPrice = PositionInfo.PriceOpen();
      double currentSL = PositionInfo.StopLoss();
      double currentTP = PositionInfo.TakeProfit();
      double bid       = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double ask       = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionInfo.PositionType();

      double newSL = currentSL;

      // Break-Even
      if(InpUseBreakEven)
        {
         double bePips = InpBreakEvenPips * PipValue;
         if(posType == POSITION_TYPE_BUY && currentSL < openPrice)
           {
            if(bid - openPrice >= bePips)
               newSL = MathMax(newSL, openPrice);
           }
         else if(posType == POSITION_TYPE_SELL && (currentSL > openPrice || currentSL == 0))
           {
            if(openPrice - ask >= bePips)
               newSL = (currentSL == 0) ? openPrice : MathMin(newSL, openPrice);
           }
        }

      // Trailing Stop
      if(InpUseTrailingStop)
        {
         double trailPips = InpTrailingPips * PipValue;
         double stepPips  = InpTrailingStep * PipValue;

         if(posType == POSITION_TYPE_BUY)
           {
            double trailLevel = bid - trailPips;
            if(trailLevel > openPrice && trailLevel > newSL + stepPips)
               newSL = MathMax(newSL, trailLevel);
           }
         else if(posType == POSITION_TYPE_SELL)
           {
            double trailLevel = ask + trailPips;
            if((currentSL == 0 || trailLevel < newSL - stepPips) &&
               (openPrice == 0 || trailLevel < openPrice))
               newSL = (newSL == 0) ? trailLevel : MathMin(newSL, trailLevel);
           }
        }

      // Modify if SL changed
      if(MathAbs(newSL - currentSL) >= Point_)
        {
         newSL = NormalizeDouble(newSL, Digits_);
         if(!Trade.PositionModify(PositionInfo.Ticket(), newSL, currentTP))
            Print("Modify failed. Error: ", GetLastError());
        }
     }
  }

//+------------------------------------------------------------------+
//| CALCULATE LOT SIZE                                               |
//+------------------------------------------------------------------+
double CalculateLotSize()
  {
   double lot = InpFixedLot;

   if(InpLotMode == LOT_PERCENT_BAL)
     {
      double balance = AccountInfo.Balance();
      double risk    = balance * InpRiskPercent / 100.0;
      double tickVal = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
      double tickSz  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
      if(tickVal <= 0 || tickSz <= 0 || InpStopLossPips <= 0) return InpFixedLot;
      double slValue = (InpStopLossPips * PipValue / tickSz) * tickVal;
      if(slValue <= 0) return InpFixedLot;
      lot = risk / slValue;
     }
   else if(InpLotMode == LOT_FIXED_DOLLAR)
     {
      double tickVal = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
      double tickSz  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
      if(tickVal <= 0 || tickSz <= 0 || InpStopLossPips <= 0) return InpFixedLot;
      double slValue = (InpStopLossPips * PipValue / tickSz) * tickVal;
      if(slValue <= 0) return InpFixedLot;
      lot = InpFixedDollarRisk / slValue;
     }

   return NormalizeLot(lot);
  }

//+------------------------------------------------------------------+
//| NORMALIZE LOT SIZE TO BROKER SPECS                               |
//+------------------------------------------------------------------+
double NormalizeLot(double lot)
  {
   double minLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double stepLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

   if(stepLot > 0) lot = MathFloor(lot / stepLot) * stepLot;
   lot = MathMax(minLot, MathMin(maxLot, lot));
   return NormalizeDouble(lot, 2);
  }

//+------------------------------------------------------------------+
//| COUNT EA'S OPEN POSITIONS                                        |
//+------------------------------------------------------------------+
int CountMyPositions(int type = -1)
  {
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(!PositionInfo.SelectByIndex(i)) continue;
      if(PositionInfo.Symbol() != _Symbol) continue;
      if(PositionInfo.Magic()  != InpMagicNumber) continue;
      if(type == -1 || PositionInfo.PositionType() == (ENUM_POSITION_TYPE)type)
         count++;
     }
   return count;
  }

//+------------------------------------------------------------------+
//| CHECK IF SPREAD IS ACCEPTABLE                                    |
//+------------------------------------------------------------------+
bool IsSpreadOK()
  {
   double spread    = (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) * Point_;
   double maxSpread = InpMaxSpreadPips * PipValue;
   return (spread <= maxSpread);
  }

//+------------------------------------------------------------------+
//| SESSION FILTER                                                   |
//+------------------------------------------------------------------+
bool IsSessionAllowed()
  {
   if(InpSession == SESSION_ALL && !InpUseCustomHours) return true;

   MqlDateTime dt;
   TimeToStruct(TimeGMT(), dt);
   int h = dt.hour;

   if(InpUseCustomHours)
      return (h >= InpStartHour && h < InpEndHour);

   switch(InpSession)
     {
      case SESSION_LONDON:  return (h >= 8  && h < 17);
      case SESSION_NY:      return (h >= 13 && h < 22);
      case SESSION_TOKYO:   return (h >= 0  && h < 9);
      case SESSION_OVERLAP: return (h >= 13 && h < 17);
      default:              return true;
     }
  }

//+------------------------------------------------------------------+
//| DAY FILTER                                                       |
//+------------------------------------------------------------------+
bool IsDayAllowed()
  {
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);

   if(InpNoTradeMonday && dt.day_of_week == 1) return false;

   if(InpNoTradeFriday && dt.day_of_week == 5) return false;

   if(InpAvoidNewsTime && dt.day_of_week == 5)
     {
      int h = dt.hour;
      if(h >= 21) return false;
     }

   return true;
  }

//+------------------------------------------------------------------+
//| DAILY P&L TRACKING & RESET                                       |
//+------------------------------------------------------------------+
void ResetDailyStats()
  {
   datetime today = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
   if(today != dayStart)
     {
      dayStart    = today;
      dailyProfit = 0.0;
      dailyLoss   = 0.0;
     }
  }

bool CheckDailyLimits()
  {
   // Sum today's closed P&L from account history
   double todayPL = 0.0;
   HistorySelect(dayStart, TimeCurrent());
   int deals = HistoryDealsTotal();
   for(int i = 0; i < deals; i++)
     {
      ulong ticket = HistoryDealGetTicket(i);
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) != InpMagicNumber) continue;
      if(HistoryDealGetString(ticket, DEAL_SYMBOL) != _Symbol) continue;
      double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      todayPL += profit;
     }

   if(InpUseDailyProfitLimit && todayPL >= InpDailyProfitLimit)
     {
      static datetime lastMsg = 0;
      if(TimeCurrent() - lastMsg > 300) { Print("Daily profit limit reached: $", DoubleToString(todayPL, 2)); lastMsg = TimeCurrent(); }
      return false;
     }

   if(InpUseDailyLossLimit && todayPL <= -InpDailyLossLimit)
     {
      static datetime lastMsg2 = 0;
      if(TimeCurrent() - lastMsg2 > 300) { Print("Daily loss limit reached: $", DoubleToString(todayPL, 2)); lastMsg2 = TimeCurrent(); }
      return false;
     }

   return true;
  }

//+------------------------------------------------------------------+
//| END OF EA                                                        |
//+------------------------------------------------------------------+
