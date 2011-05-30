/*global window, document */
(function(global, dom, loader, $){

	var jQueryCache = {};
	
	function find(selector) {
		if (!jQueryCache.hasOwnProperty(selector)) {
			jQueryCache[selector] = $(selector);
		}
		return jQueryCache[selector];
	}
	
	function updateStatus(className, statusText) {
		var classNames = 'notice error success working'; 
		find('#status')
			.removeClass(classNames)
			.addClass(className)
			.text(statusText || '');
	}
	
	function togglePanels(selector) {
		find('.panel')
			.removeClass('active')
			.filter(selector)
			.addClass('active');
	}
	
	function loadModel(session, callback) {
		$.post('/api/model', { session: session }, callback);
	}
	
	function loadSession(data, callback) {
		$.post('/api/session', data, callback);
	}	
	
	function getSession() {
		return (global.location.hash || '').replace('#', '');
	}
	
	function applyModel(status) {
		if (!status.error) {
			
		} else {
			updateStatus('error', status.error);
		}
	}
	
	function applySession(status) {
		if (!status.error) {
			updateStatus('success', 'Connection Successful');
		} else {
			updateStatus('error', status.error);
		}
	}
	
	function onLogin(event) {
		var data = find("#login").serialize();
		updateStatus('working', 'Logging in, please wait...');
		loadSession(data, applySession);
		event.preventDefault();
	}
	
	function attachDelegates() {
		find('#login').submit(onLogin);
	}
	
	function checkState() {
		var session = getSession();		
		if (session) {
			loadModel(session, applyModel);
		} else {
			updateStatus('notice', 'Please Log In.');
			togglePanels('#login');
		}
	}
	
	function onReady() {
		attachDelegates();
		checkState();
	}
	
	loader.ready(onReady);
	
})(window, document, window.head, window.jQuery);