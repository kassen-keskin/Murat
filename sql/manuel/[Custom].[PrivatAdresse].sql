CREATE VIEW [Custom].[PrivatAdresse] as
select 
	A.kKunde,
	A.cStrasse,
	A.cPLZ,
	A.cOrt
from tAdresse  as A with(nolock)
where A.nTyp = 2