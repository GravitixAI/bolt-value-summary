export interface PropertyRecord {
  Year: number;
  PropID: number;
  GeoID: string;
  OwnerName: string;
  AgentName: string | null;
  Situs: string;

  // Land
  Land_SqFt: number;
  Land_Acres: number;
  Land_SqFt_UP: number;
  Land_Acres_UP: number;
  Land_UnitPrice: number;
  Land_ApprMethod: string; // "SQ" = per sq ft, else per acre
  LandBuilding_Ratio: number;

  // Neighborhood / sub-market
  Nbhd: string | null;

  // Improvement
  SubMarket: string;
  Imprv_Type: string;
  Imprv_GrossBldgArea: number;
  Imprv_NetLeasableArea: number;
  Imprv_YearBuilt: number;

  // Approaches
  ApprMethod: string; // leading char: "C"=Cost, "I"=Income, "M"=Market

  // Cost Approach
  Cost_TotalVal: number;
  Cost_UnitPrice: number;
  Cost_LandVal: number;
  Cost_ImprvVal: number;

  // Income Approach
  Income_TotalVal: number;
  Income_UnitPrice: number;
  RentRate: number;
  ExpenseStructureCd: string;
  OccupancyRate: number;
  GPIVacanyRate: number;
  NetOperatingIncome: number;
  CapRate: number;
  ExcessLandVal: number;
  LeaseUpCost: number;
  BPP_Val: number;
  Other_Adj: number;

  // Market Approach
  Market_AvgSalesPricePSF: string | number | null;
  Market_NumOfSales: string | number | null;

  // Totals
  AssessedVal: number;
  RecommendedVal: number;
  Total_AssessedVal: number;
  Total_RecommendedVal: number;

  // Protest (may be null)
  ProtCaseID: number | null;
  ProtAppraiser: string | null;
  ProtByName: string | null;
  ProtHearingDate: string | null;
  ProtHearingTime: string | null;
  ProtHearingDateTime: string | null;
  ProtReasons: string | null;

  // Other
  MainImagePath: string | null;
  IncomeID: number | null;
  PrimaryProp: number;
  BPP_Val_extra?: number;
}

export interface CommercialValueSummaryResponse {
  data: PropertyRecord[];
}

export interface ApproachState {
  cost: boolean;
  income: boolean;
  market: boolean;
  /** true = show "Price per sq. ft.", false = show "Price per acre" */
  showSqFt: boolean;
}
