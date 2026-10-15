select 
	RP.cArtNr,
	RP.cName as ArtName,
	k.kKunde
from Rechnung.tRechnung as R
LEFT OUTER JOIN Kunde.lvKunde as K on R.kKunde = K.kKunde
LEFT OUTER JOIN Rechnung.tRechnungEckdaten as RE on R.kRechnung = RE.kRechnung
LEFT OUTER JOIN Rechnung.tRechnungPosition as RP on RP.kRechnung = R.kRechnung
where 1=1
and RP.cArtNr in (
'349','350','358','373','396','400','404','418','424','428','316','327','338'
,'42','58','170','207','214','288','296','297','375','376'
,'183','196'
,'3'
,'386','387','388','389','397', '384'
,'235'
,'286', '300'

)
--and K.cKundenNr = '2584'
order by R.dErstellt desc