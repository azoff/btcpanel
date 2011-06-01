/*global window, document */
(function(global, dom, loader, $){

	var 
	globalScope = $({}),
	tickerInterval = 5000, 
	handlers = {};
	
	function find(selector, scope) {
		var cache = scope || globalScope;
		if (!cache.data('selector')) {
			cache[selector] = $(selector, scope);
		}
		return cache[selector];
	}
	
	function moneyFormat(value, precision) {
		precision = precision === undefined ? 4 : precision;
		return parseFloat(value, 10).toFixed(precision);
	}
	
	function updateStatus(scope, className, statusText) {
		var classNames = 'notice error success working'; 
		find('.status-msg', scope)
			.removeClass(classNames)
			.addClass(className)
			.text(statusText || '');
	}
	
	function saveSettings() {
		find('#settings').saveFormState();
	}
	
	function setting(id) {
		return find('#' + id).prop('checked');
	}
	
	handlers.applyRpcData = function applyRpcData(section, accounts) {
		var parent = find('.funds', section).empty();
		$.each(accounts, function(i, account) {
			$('<div class="fund"><small>' + account.label + '</small><span>&nbsp;Balance (Q): <strong class="balance">' + moneyFormat(account.balance) + '</strong> BTC&nbsp;</span></div>').appendTo(parent);
		});
	};
	
	function applyTickerData(section, ticker){
		var tickers = find(".ticker-value", section).removeClass('bull bear'),
			potentials = find('.potential', section),
			buy = moneyFormat(ticker.buy),
			sell = moneyFormat(ticker.sell),
			last = moneyFormat(ticker.last), 
			vol = moneyFormat(ticker.vol, 0),
			low = moneyFormat(ticker.low), 
			high = moneyFormat(ticker.high),
			className = buy > last ? 'bull' : 'bear';
		if (buy !== last) { tickers.addClass(className); }
		find('.ticker_buy strong', section).text(buy);
		find('.ticker_sell strong', section).text(sell);
		find('.ticker_high strong', section).text(high);
		find('.ticker_low strong', section).text(low);
		find('.ticker_vol strong', section).text(vol);
		potentials.each(function(){
			var potential = $(this), balance = potential.data('balance');
			if (potential.hasClass('buy-potential')) {
				potential.text(moneyFormat(balance / sell));
			} else {
				potential.text(moneyFormat(balance * buy));
			}
		});
	}
	
	function loopTickers(section) {
		$.post('/api/loadTickerData', function(status) {
			if (status.error) {
				updateStatus(section, 'error', status.error);
			} else {
				applyTickerData(section, status);
				if (section.hasClass('active')) {
					setTimeout(function(){ 
						loopTickers(section); 
					}, tickerInterval);
				}
			}
		});
	}
	
	function applyFunds(section, data) {
		var usds = moneyFormat(data.usds), btcs = moneyFormat(data.btcs);
		find('.fund-usd .balance', section).text(usds);
		find('.fund-usd .potential', section).data('balance', usds);
		find('.fund-btc .balance', section).text(btcs);
		find('.fund-btc .potential', section).data('balance', btcs);
	}
	
	handlers.applyMtGoxData = function applyMtGoxData(section, data) {
		applyFunds(section, data);
		loopTickers(section);
	};
	
	function deferHandler(event) {
		event.preventDefault();
		var form = $(this), 
			section = form.closest('section'),
			url = form.attr('action'),
			data = form.serialize(),
			handler = handlers[form.data('handler')];
		updateStatus(section, 'working', 'Fetching account data...');
		$.post(url, data).done(function(status){
			if (status.error) {
				updateStatus(section, 'error', status.error);
			} else {
				section.addClass('active').removeClass('inactive');
				if (setting('save_state')) { form.saveFormState(); }
				updateStatus(section, 'success', 'Active.');
				handler(section, status);
			}
		});
	}
	
	function deactivatePanel(event) {
		event.preventDefault();
		var section = $(this).closest('section');
		updateStatus(section, 'notice', 'Logged Out.');
		section.addClass('inactive').removeClass('active');
	}
	
	function attachDelegates() {
		// wire up settings
		find('#settings').loadFormState().delegate('input', 'change', saveSettings);
		// wire up active forms
		find('form.active').live('submit', deactivatePanel);
		// wire up inactive forms
		var inactiveForms = find('form.inactive').live('submit', deferHandler);
		if (setting('save_state')) { 
			inactiveForms.loadFormState(setting('auto_login')); 
		}
	}
	
	loader.ready(attachDelegates);
	
})(window, document, window.head, window.jQuery);