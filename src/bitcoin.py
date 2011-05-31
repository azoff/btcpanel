from src.jsonrpc import ServiceProxy
from decimal import Decimal
import logging

class BitcoinRpcProxy():
	
	def __init__(self, username, password, hostname, port):
		url = "http://%s:%s@%s:%s" % (username, password, hostname, port)
		self.proxy = ServiceProxy(url)
		
	def getAccountData(self):
		accounts = self.proxy.listaccounts()
		if 'error' in accounts:
			return accounts
		else:
			response = []
			accountNames = accounts.keys()
			for accountName in accountNames:
				response.append({
					'label': accountName,
					'balance': self._toFloat(accounts[accountName])
				})

			return response
			
	#TODO: Analyze the risks of using floats
	def _toFloat(self, value):
		operand = Decimal('1E8')
		return float(round(value * operand))