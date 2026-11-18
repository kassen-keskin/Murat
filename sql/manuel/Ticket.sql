SELECT [kBenutzer],[cLogin],[cPasswort],[cName] FROM [eazybusiness].[dbo].[tBenutzer]

SELECT *
--delete
FROM [Ticketsystem].[tTicket]
where cEindeutigeId in (
 'T26-03KASIM1' 
)

SELECT *
--delete
FROM [Ticketsystem].[tTicketEckdaten]
where kTicket in (
2507
)