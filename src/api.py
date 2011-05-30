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
		
	def session(self):
		mgUser = self.arg('mg_user')
		mgPass = self.arg('mg_pass')
		rpcUser = self.arg('rpc_user')
		rpcPass = self.arg('rpc_pass')
		rpcHost  = self.arg('rpc_host')
		rpcPort  = self.arg('rpc_port')
		if  len(mgUser) > 0 and len(mgPass) > 0 and len(rpcUser) > 0 and len(rpcPass) > 0 and len(rpcHost) > 0 and len(rpcPort) > 0:
			mgFunds = MtGoxAccount(mgUser, mgPass).getFunds()
			if ('error' in mgFunds):
				logging.error(mgFunds['error'])
				self.respond({ 'error': 'Login Rejected: Mt. Gox Servers.' })
			else:
				proxy = BitcoinRpcProxy(rpcUser, rpcPass, rpcHost, rpcPort)
				rpcAccounts = proxy.listAccounts() 
				if ('error' in rpcAccounts):
					logging.error(rpcAccounts['error'])
					self.respond({ 'error': 'Login Rejected: RPC Server.' })
				else:
					self.respond({
						'accounts': {
							'rpc': rpcAccounts,
							'mg': mgFunds
						}
					})
		else:
			self.respond({ 'error': 'Missing one or more parameters.' })

	def ticker(self):
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