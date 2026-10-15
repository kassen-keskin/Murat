/*
DISABLE TRIGGER tgr_tAdresse_INSUPDEL ON dbo.tAdresse;
ENABLE  TRIGGER tgr_tAdresse_INSUPDEL ON dbo.tAdresse;
*/

select CAST(K.cWWW AS NVARCHAR(30)) as cWWW, A.cFax 

--update A set A.cFax = CAST(K.cWWW AS NVARCHAR(30))
from dbo.tkunde as K with(nolock)
INNER JOIN dbo.tAdresse as A with(nolock) ON A.kKunde = K.kKunde
where 1 = 1
and isNULL(A.cFax, '') = ''
and isNULL(K.cWWW, '') > ''
