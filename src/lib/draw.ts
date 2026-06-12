// The beefstake draw: 16 entrants, 3 teams each (all 48 World Cup 2026 teams).
// `code` is the FIFA 3-letter code; `aliases` cover the various spellings
// football-data.org might use, so live scores match reliably.

export type Team = {
  name: string;
  flag: string;
  code: string;
  aliases: string[];
};

export type Entrant = {
  name: string;
  teams: Team[];
};

const team = (
  name: string,
  flag: string,
  code: string,
  aliases: string[] = [],
): Team => ({ name, flag, code, aliases: [name, ...aliases] });

// Reusable team definitions, so the same Team object can be referenced once.
const T = {
  France: team("France", "🇫🇷", "FRA"),
  Sweden: team("Sweden", "🇸🇪", "SWE"),
  DRCongo: team("DR Congo", "🇨🇩", "COD", [
    "Congo DR",
    "Democratic Republic of Congo",
    "Congo Democratic Republic",
  ]),
  Ghana: team("Ghana", "🇬🇭", "GHA"),
  Germany: team("Germany", "🇩🇪", "GER"),
  IvoryCoast: team("Ivory Coast", "🇨🇮", "CIV", ["Côte d'Ivoire", "Cote d'Ivoire"]),
  Austria: team("Austria", "🇦🇹", "AUT"),
  USA: team("USA", "🇺🇸", "USA", ["United States", "United States of America"]),
  Uzbekistan: team("Uzbekistan", "🇺🇿", "UZB"),
  Morocco: team("Morocco", "🇲🇦", "MAR"),
  Curacao: team("Curacao", "🇨🇼", "CUW", ["Curaçao"]),
  Paraguay: team("Paraguay", "🇵🇾", "PAR"),
  Argentina: team("Argentina", "🇦🇷", "ARG"),
  Qatar: team("Qatar", "🇶🇦", "QAT"),
  SouthKorea: team("South Korea", "🇰🇷", "KOR", ["Korea Republic", "Korea, South"]),
  Colombia: team("Colombia", "🇨🇴", "COL"),
  Bosnia: team("Bosnia", "🇧🇦", "BIH", [
    "Bosnia & Herzegovina",
    "Bosnia and Herzegovina",
    "Bosnia-Herzegovina",
  ]),
  Ecuador: team("Ecuador", "🇪🇨", "ECU"),
  Netherlands: team("Netherlands", "🇳🇱", "NED", ["Holland"]),
  CapeVerde: team("Cape Verde", "🇨🇻", "CPV", ["Cabo Verde"]),
  Switzerland: team("Switzerland", "🇨🇭", "SUI"),
  Uruguay: team("Uruguay", "🇺🇾", "URU"),
  Canada: team("Canada", "🇨🇦", "CAN"),
  Algeria: team("Algeria", "🇩🇿", "ALG"),
  Jordan: team("Jordan", "🇯🇴", "JOR"),
  England: team("England", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "ENG"),
  Turkiye: team("Türkiye", "🇹🇷", "TUR", ["Turkiye", "Turkey"]),
  Czechia: team("Czechia", "🇨🇿", "CZE", ["Czech Republic"]),
  Senegal: team("Senegal", "🇸🇳", "SEN"),
  Egypt: team("Egypt", "🇪🇬", "EGY"),
  Brazil: team("Brazil", "🇧🇷", "BRA"),
  Panama: team("Panama", "🇵🇦", "PAN"),
  SouthAfrica: team("South Africa", "🇿🇦", "RSA"),
  Belgium: team("Belgium", "🇧🇪", "BEL"),
  SaudiArabia: team("Saudi Arabia", "🇸🇦", "KSA", ["Saudi Arabia"]),
  Norway: team("Norway", "🇳🇴", "NOR"),
  Haiti: team("Haiti", "🇭🇹", "HAI"),
  Mexico: team("Mexico", "🇲🇽", "MEX"),
  Japan: team("Japan", "🇯🇵", "JPN"),
  Iran: team("Iran", "🇮🇷", "IRN", ["IR Iran", "Iran Islamic Republic"]),
  Portugal: team("Portugal", "🇵🇹", "POR"),
  Tunisia: team("Tunisia", "🇹🇳", "TUN"),
  Croatia: team("Croatia", "🇭🇷", "CRO"),
  Iraq: team("Iraq", "🇮🇶", "IRQ"),
  Scotland: team("Scotland", "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "SCO"),
  Spain: team("Spain", "🇪🇸", "ESP"),
  Australia: team("Australia", "🇦🇺", "AUS"),
  NewZealand: team("New Zealand", "🇳🇿", "NZL"),
} as const;

export const ENTRANTS: Entrant[] = [
  { name: "Brown", teams: [T.France, T.Sweden, T.DRCongo] },
  { name: "Shmue", teams: [T.Ghana, T.Germany, T.IvoryCoast] },
  { name: "YG", teams: [T.Austria, T.USA, T.Uzbekistan] },
  { name: "NEET", teams: [T.Morocco, T.Curacao, T.Paraguay] },
  { name: "Beef", teams: [T.Argentina, T.Qatar, T.SouthKorea] },
  { name: "Rat", teams: [T.Colombia, T.Bosnia, T.Ecuador] },
  { name: "Tesh", teams: [T.Netherlands, T.CapeVerde, T.Switzerland] },
  { name: "Fitz", teams: [T.Uruguay, T.Canada, T.Algeria] },
  { name: "Fin", teams: [T.Jordan, T.England, T.Turkiye] },
  { name: "Nick", teams: [T.Czechia, T.Senegal, T.Egypt] },
  { name: "Dung Beatle", teams: [T.Brazil, T.Panama, T.SouthAfrica] },
  { name: "Waterz J", teams: [T.Belgium, T.SaudiArabia, T.Norway] },
  { name: "Bogman", teams: [T.Haiti, T.Mexico, T.Japan] },
  { name: "Flop", teams: [T.Iran, T.Portugal, T.Tunisia] },
  { name: "Norm", teams: [T.Croatia, T.Iraq, T.Scotland] },
  { name: "Budge", teams: [T.Spain, T.Australia, T.NewZealand] },
];

export const ALL_TEAMS: Team[] = ENTRANTS.flatMap((e) => e.teams);

// Find which entrant owns a team, by its FIFA code.
export const entrantByTeamCode = (code: string): Entrant | undefined =>
  ENTRANTS.find((e) => e.teams.some((t) => t.code === code));

export const PRIZES = {
  winner: { emoji: "🏆", label: "Tournament Winner", amount: 90 },
  goals: { emoji: "⚽", label: "Team with most goals", amount: 40 },
  redCard: { emoji: "🟥", label: "First red card", amount: 30 },
} as const;

// First red card isn't available on the football-data.org free tier, so set it
// here by hand once it happens. Use the team's FIFA code, e.g. "BRA".
export const FIRST_RED_CARD_TEAM_CODE: string | null = "RSA";
