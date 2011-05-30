
"""
  Copyright 2011 Jeff Garzik
  
  AuthServiceProxy has the following improvements over python-jsonrpc's
  ServiceProxy class:
  
  - HTTP connections persist for the life of the AuthServiceProxy object
    (if server supports HTTP/1.1)
  - sends protocol 'version', per JSON-RPC 1.1
  - sends proper, incrementing 'id'
  - sends Basic HTTP authentication headers
  - parses all JSON numbers that look like floats as Decimal
  - uses standard Python json lib
  
  Previous copyright, from python-jsonrpc/jsonrpc/proxy.py:
  
  Copyright (c) 2007 Jan-Klaas Kollhof
  
  This file is part of jsonrpc.
  
  jsonrpc is free software; you can redistribute it and/or modify
  it under the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 2.1 of the License, or
  (at your option) any later version.
  
  This software is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.
  
  You should have received a copy of the GNU Lesser General Public License
  along with this software; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
"""

import httplib
import base64
import simplejson
import decimal
import urlparse
from google.appengine.api.urlfetch import DownloadError 

USER_AGENT = "AuthServiceProxy/0.1"

HTTP_TIMEOUT = 30

class JSONRPCException(Exception):
	def __init__(self, rpcError):
		Exception.__init__(self)
		self.error = rpcError

class AuthServiceProxy(object):
	def __init__(self, serviceURL, serviceName=None):
		self.__serviceURL = serviceURL
		self.__serviceName = serviceName
		self.__url = urlparse.urlparse(serviceURL)
		if self.__url.port is None:
			port = 8332
		else:
			port = self.__url.port
		self.__idcnt = 0
		authpair = "%s:%s" % (self.__url.username, self.__url.password)
		self.__authhdr = "Basic %s" % (base64.b64encode(authpair))
		self.__conn = httplib.HTTPConnection(self.__url.hostname, port, False, HTTP_TIMEOUT)

	def __getattr__(self, name):
		if self.__serviceName != None:
			name = "%s.%s" % (self.__serviceName, name)
		return AuthServiceProxy(self.__serviceURL, name)

	def __call__(self, *args):
		self.__idcnt += 1
		postdata = simplejson.dumps({
			'version': '1.1',
			'method': self.__serviceName,
			'params': args,
			'id': self.__idcnt})
		self.__conn.request('POST', self.__url.path, postdata,{ 
			'User-Agent' : USER_AGENT,
			'Authorization' : self.__authhdr,
			'Content-type' : 'application/json' })
		httpresp = None
		try:
			httpresp = self.__conn.getresponse()
		except(DownloadError):
			return { 'error': 'Connection Refused.' }
			
		if httpresp is None:
			return { 'error': 'Missing HTTP response from server.' }
		
		resp = simplejson.loads(httpresp.read(), parse_float=decimal.Decimal)
		if resp['error'] != None:
			return { 'error': resp['error'] }
		elif 'result' not in resp:
			return { 'error': 'Missing JSON-RPC result.' }
		else:
			return resp['result']


