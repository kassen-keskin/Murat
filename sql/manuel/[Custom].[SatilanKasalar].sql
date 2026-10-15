ALTER view [Custom].[SatilanKasalar] as 
select 
	RP.cName as ArtName,
	k.kKunde
from Rechnung.tRechnung as R with(nolock)
INNER JOIN Kunde.lvKunde as K with(nolock) on R.kKunde = K.kKunde
INNER JOIN Rechnung.tRechnungEckdaten as RE with(nolock) on R.kRechnung = RE.kRechnung
INNER JOIN Rechnung.tRechnungPosition as RP with(nolock) on RP.kRechnung = R.kRechnung
where 1=1
--and K.kKunde = 9494
and RP.cArtNr in (--'28','30','61','81','85',
'349','350','358','373','396','400','404','418','424','428','316','327','338'
,'42','58','170','207','214','219','287','288','296','297','374','375','376','321'
,'183','196','195','102','57','124','126','200','199','198'
,'3','295','335','355'
,'386','387','397', '384'
,'235'
,'286', '300'
,'467','468'
)
GO


