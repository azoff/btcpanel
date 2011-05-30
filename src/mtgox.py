from google.appengine.api import urlfetch
import config, simplejson, logging, urllib

class MtGoxAccount():
	
	def __init__(self, username, password):
		self.username = username
		self.password = password

	def getFunds(self):
		return self._request('getFunds')

	def _request(self, method, args = None):
		url = config.MTGOX_API_URL % method
		if args is None:
			args = {}
		args['name'] = self.username
		args['pass'] = self.password
		args = '&'.join([k+'='+urllib.quote(str(v)) for (k,v) in args.items()])
		response = urlfetch.fetch(url, args, 'POST')
		try:
			return simplejson.loads(response.content)
		except Exception, e:
			logging.error("Parse error on Mt.Gox response: %s" % e)
			return { 'error': 'Invalid JSON Response.' };