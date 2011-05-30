/*global window, document */
(function(global, dom, loader, $){

	var jQueryCache = {};
	
	function find(selector) {
		if (!jQueryCache.hasOwnProperty(selector)) {
			jQueryCache[selector] = $(selector);
		}
		return jQueryCache[selector];
	}
	
	function moneyFormat(value, precision) {
		precision = precision === undefined ? 4 : precision;
		return parseFloat(value, 10).toFixed(precision);
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
				buy = moneyFormat(status.buy),
				sell = moneyFormat(status.sell),
				last = moneyFormat(status.last), 
				vol = moneyFormat(status.vol, 0),
				low = moneyFormat(status.low), 
				high = moneyFormat(status.high),
				className = buy > last ? 'bull' : 'bear';
			if (buy !== last) { tickers.addClass(className); }
			find('#ticker_buy strong').text(buy);
			find('#ticker_sell strong').text(sell);
			find('#ticker_high strong').text(high);
			find('#ticker_low strong').text(low);
			find('#ticker_vol strong').text(vol);
		}
	}
	
	function loadTicker(callback) {
		$.post('/api/ticker', callback);
	}
	
	function applyPotential(status) {
		var potentials = find('.potential'),
			buy = moneyFormat(status.buy),
			sell = moneyFormat(status.sell);
		potentials.each(function(){
			var potential = $(this), balance = potential.data('balance');
			if (potential.hasClass('buy-potential')) {
				potential.text(moneyFormat(balance / sell));
			} else {
				potential.text(moneyFormat(balance * buy));
			}
		});
	}
	
	function loopTicker() {
		loadTicker(function(status){
			applyTicker(status);
			applyPotential(status);
			setTimeout(loopTicker, 5000);
		});
	}
	
	function applyFunds(status) {
		var usds = moneyFormat(status.usds), btcs = moneyFormat(status.btcs);
		find('#fund_usd .balance').text(usds);
		find('#fund_usd .potential').data('balance', usds);
		find('#fund_btc .balance').text(btcs);
		find('#fund_btc .potential').data('balance', btcs);
	}
	
	function applySession(status) {
		if (!status.error) {
			updateStatus('success', 'Connection Successful');
			togglePanels('#wallet, #exchange');
			applyFunds(status.accounts.mg);
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