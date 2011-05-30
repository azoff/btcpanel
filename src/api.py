from django.utils import simplejson
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from src.mtgox import MtGoxAccount
from src.jsonrpc import ServiceProxy
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
		bsUser = self.arg('bs_user')
		bsPass = self.arg('bs_pass')
		bsHost  = self.arg('bs_host')
		bsPort  = self.arg('bs_port')
		if  len(mgUser) > 0 and len(mgPass) > 0 and len(bsUser) > 0 and len(bsPass) > 0 and len(bsHost) > 0 and len(bsPort) > 0:
			mgBalance = MtGoxAccount(mgUser, mgPass).getFunds()
			if ('error' in mgBalance):
				logging.error(mgBalance['error'])
				self.respond({ 'error': 'Login Rejected: Mt. Gox Servers.' })
			else:
				proxy = ServiceProxy("http://%s:%s@%s:%s" % (bsUser, bsPass, bsHost, bsPort))
				bsInfo = proxy.getinfo()
				if ('error' in bsInfo):
					logging.error(bsInfo['error'])
					self.respond({ 'error': 'Login Rejected: RPC Server.' })
				else:
					self.respond({})
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