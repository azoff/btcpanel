from google.appengine.api import urlfetch
import config, simplejson, logging, urllib

class MtGoxAccount():
	
	def __init__(self, username = '', password = ''):
		self.username = username
		self.password = password
		self.auth     = True

	def getFunds(self):
		return self._request('getFunds')
		
	def ticker(self):
		return self._request('data/ticker')

	def _request(self, method, args = None):
		url = config.MTGOX_API_URL % method
		if self.auth:
			if args is None:
				args = {}
			args['name'] = self.username
			args['pass'] = self.password
		if args is not None:
			args = '&'.join([k+'='+urllib.quote(str(v)) for (k,v) in args.items()])
		response = urlfetch.fetch(url, args, 'POST')
		try:
			return simplejson.loads(response.content)
		except Exception, e:
			logging.error("Parse error on Mt.Gox response: %s" % e)
			return { 'error': 'Invalid JSON Response.' };