select 
('Name,Client-ID,Alias,Kommentar,Tags' )
--Name,Client-ID,Alias,Kommentar,Tags
union all
(
select
  K.cKundenNr+ '-'+ CONVERT(VARCHAR, K.cFirma , 104) + ','	--Buchungstext
+ trim(K.cWWW) 
+ ',,,'

from Kunde.lvKunde as K with(nolock) 
where 1=1
--and K.cKundenNr is not null
and trim(K.cWWW) <> ''--is not null
--and isnumeric(trim(K.cWWW)) = 1
) 

