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
	
	function loadSession(data, callback) {
		$.post('/api/session', data, callback);
	}	
	
	function getSession() {
		return (global.location.hash || '').replace('#', '');
	}
	
	function applyTicker(status){
		if (!status.error) {
			var tickers = find(".ticker-value").removeClass('bull bear'),
				buy = parseFloat(status.buy, 10),
				sell = parseFloat(status.sell, 10),
				last = parseFloat(status.last, 10), 
				vol = parseFloat(status.vol, 10),
				low = parseFloat(status.low, 10), 
				high = parseFloat(status.high, 10),
				className = buy > last ? 'bull' : 'bear';
			if (buy !== last) { tickers.addClass(className); }
			tickers.filter('#ticker_buy').data('low', low).find('strong').text(buy);
			tickers.filter('#ticker_sell').data('high', high).find('strong').text(sell);
			tickers.filter('#ticker_vol').find('strong').text(vol);
		}
	}
	
	function loadTicker(callback) {
		$.post('/api/ticker', callback);
	}
	
	function loopTicker() {
		loadTicker(function(status){
			applyTicker(status);
			setTimeout(loopTicker, 5000);
		});
	}
	
	function applySession(status) {
		if (!status.error) {
			updateStatus('success', 'Connection Successful');
			togglePanels('#wallet, #exchange');
			loopTicker();
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
	
	function onReady() {
		attachDelegates();
		updateStatus('notice', 'Please Log In.');
		togglePanels('#login');
	}
	
	loader.ready(onReady);
	
})(window, document, window.head, window.jQuery);