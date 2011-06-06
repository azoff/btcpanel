from django.utils import simplejson
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from src.mtgox import MtGoxAccount
from src.bitcoin import BitcoinRpcProxy
import config, logging

class ApiRequestHandler(webapp.RequestHandler):

	def handle(self):
		method = self.getMethod()
		if method is not None:
			method()
		else:
			self.unknown()

	def get(self):
		self.handle()

	def post(self):
		self.handle()
		
	def getMethod(self):
		path = self.request.path.split('/')
		if len(path) == 3:
			method = getattr(self, path[2], None)
			return method
		else:
			return None

	def respond(self, value):
		value = simplejson.dumps(value)
		self.response.set_status(200)
		self.response.headers['Content-Type'] = 'application/json'
		self.response.out.write(value)
		
	def unknown(self):
		self.respond({ 'error': 'Unknown method.' })
		
	def loadMtGoxData(self):
		user = self.arg('user')
		pasw = self.arg('pass')
		if len(pasw) > 0 and len(user) > 0:
			self.respond(MtGoxAccount(user, pasw).getOrders())
		else:
			self.respond({ 'error': 'Missing required parameter.' })
		
	def placeMtGoxOrder(self):
		user = self.arg('user')
		pasw = self.arg('pass')
		amount = self.arg('amount')
		price = self.arg('price')
		orderType = self.arg('type')
		if len(pasw) > 0 and len(user) > 0 and len(amount) > 0 and len(price) > 0 and len(orderType) > 0:
			if orderType == 'sell' or orderType == 'buy':
				if (amount > 0 and price > 0):
					self.respond(MtGoxAccount(user, pasw).placeOrder(orderType, amount, price))
				else:
					self.respond({ 'error': 'Quantity and price must be positve, non-zero values' })
			else:
				self.respond({ 'error': 'Invalid order type: %s' % orderType })
		else:
			self.respond({ 'error': 'Missing or empty required parameter.' })
		
	def loadRpcData(self):
		user = self.arg('user')
		pasw = self.arg('pass')
		host = self.arg('host')
		port = self.arg('port')
		if len(user) > 0 and len(pasw) > 0 and len(host) > 0 and len(port) > 0:
			proxy = BitcoinRpcProxy(user, pasw, host, port)
			accountData = proxy.getAccountData() 
			self.respond(accountData)
		else:
			self.respond({ 'error': 'Missing one or more required parameters.' })

	def loadTickerData(self):
		response = MtGoxAccount().ticker()
		if 'ticker' in response:
			response = response['ticker']
		self.respond(response)

	def arg(self, key, default=""):
		value = self.request.get(key, default).strip()
		return value
		
if __name__ == '__main__':
	application = webapp.WSGIApplication([('/api/.*', ApiRequestHandler)], debug=config.IS_DEV_MODE)
	util.run_wsgi_app(application)