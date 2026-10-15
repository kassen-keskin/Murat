select 
('"Belegdatum";"Buchungsdatum";"Belegnummernkreis";"Belegnummer";"Buchungstext";"Buchungsbetrag";"Sollkonto";"Habenkonto";"Steuerschlüssel";"Kostenstelle 1";"Kostenstelle 2";"Zusatzangaben"' )

union all

(
select 
+'"'+CONVERT(VARCHAR, Z.dDatum, 104)				+ '";'										--Belegdatum
+'"'+CONVERT(VARCHAR, Z.dDatum, 104)				+ '";'										--Buchungsdatum
+'"Kasse-";'  --Belegnummernkreis
+CONVERT(VARCHAR,ROW_NUMBER() OVER (ORDER BY Z.dDatum), 104)	+ '";'	--Belegnummer
+'"KD:' + K.cKundenNr+ '-'+ CONVERT(NVARCHAR, K.cFirma , 104) + '";'							--Buchungstext
+CONVERT(VARCHAR, cast( sum(Z.fBetrag) as decimal(13,2)), 104) + ';'						--Buchungsbetrag

+CONVERT(VARCHAR, 
case Z.cName 
when 'Bar'				then '1600'
when 'Bank'				then '1800'
when 'Amazon'			then '1820'
when 'Ebay'				then '1810'
when 'Ec-Karte SumUp'	then '1800'
ELSE '1600'
end, 104) + ';'							--Sollkonto
 
+'4400;'								--Habenkonto

+CONVERT(VARCHAR, 0, 104)		+ ';'	--Steuerschlüssel
+CONVERT(VARCHAR, '""', 104)	+ ';'	--[Kostenstelle 1]
+CONVERT(VARCHAR, '""', 104)	+ ';'	--[Kostenstelle 2]
+CONVERT(VARCHAR, -1, 104)		+ ''	--Zusatzangaben

from tZahlung							as Z  with(nolock)
INNER JOIN Rechnung.tRechnung			as R  with(nolock) on R.kRechnung	= Z.kRechnung
INNER JOIN Kunde.lvKunde				as K  with(nolock) on R.kKunde		= K.kKunde
where  Z.dDatum between cast('2026-01-01 00:00:00.000' as date)  and cast('2026-01-31 00:00:00.000' as date)
and Z.cName = 'Bar'
group by  Z.dDatum, R.cRechnungsnr, K.cKundenNr, K.cFirma, Z.cName
)