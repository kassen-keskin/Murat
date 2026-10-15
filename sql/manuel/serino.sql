--satis
SELECT * from [Mandant_2].[Custom].[SeriNo] with(nolock)   
--where kKunde = '2292'
--and ArtikelSeriNo = 'E075-24100038'


--depo
--select * from [Mandant_2].dbo.tLagerArtikel 
--where cSeriennr = 'E075-24100038'

select * from tArtikelBeschreibung
select * 
from tkategorieartikel as KA 
INNER JOIN tArtikelBeschreibung as AB on KA.kArtikel = AB.kArtikel
where KA.kKategorie in (13,31,54,106)
order by KA.kKategorie


select * from tKategorieSprache
order by 





