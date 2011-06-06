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
		value = parseFloat(value, 10).toFixed(precision);
		return value >= 0 ? value : NaN;
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
	
	function activateSection(section) {
		section.addClass('active').removeClass('inactive');
		updateStatus(section, 'success', 'Active.');
	}
	
	handlers.deactivateSection = function deactivateSection(section) {
		section.addClass('inactive').removeClass('active');
		updateStatus(section, 'success', 'Logged Out.');
	};
	
	handlers.applyRpcData = function applyRpcData(section, accounts) {
		var parent = find('.funds', section).empty();
		$.each(accounts, function(i, account) {
			$('<div class="fund"><small>' + account.label + '</small><span>&nbsp;Balance (Q): <strong class="balance">' + moneyFormat(account.balance) + '</strong> BTC&nbsp;</span></div>').appendTo(parent);
		});
		activateSection(section);
	};
	
	function refreshOrder(section) {
		var type      = find('.order-type', section).val().toUpperCase(),
			selector  = type === 'BUY' ? '.ticker_sell strong' : '.ticker_buy strong',
			price     = moneyFormat(find(selector, section).text()),
			quantity  = moneyFormat(find('.order-qty', section).val(), 0),
			market    = find('.order-market', section).prop('checked'),
			priceNode = find('.order-price', section), total;
		if (market) { priceNode.val(price); }
		else { price = priceNode.val(); }
		total = moneyFormat(price * quantity, 2);
		if (isNaN(total) || total <= 0) { 
			total = '--'; 
			find('.order-submit').prop('disabled', true);
		} else {
			find('.order-submit').prop('disabled', false);
		}
		find('.simulation-order', section).text(type);
		find('.simulation-total', section).text(total);
	}
	
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
		refreshOrder(section);
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
	
	function applyOrderData(section, orders) {
		var parent = find('.orders', section);
		if (orders && orders.length) {			
			$.each(orders, function(i, order) {
				var nodeList = parent.find('.orders-open').empty(),
					orderNode = $('<div/>').addClass('order'),
					statusClass = order.status==='1'?'pass':'fail',
					statusText = order.status==='1'?'Active':'Insufficient Funds',
					titleText = "Order " + order.oid,
					detailsText = (order.type === 2 ? 'BUY' : 'SELL') + ' ' + moneyFormat(order.amount, 0) + ' BTC @ ' + moneyFormat(order.price, 4) + ' USD',
					orderTitle = $('<div/>').addClass('order-title').text(titleText).appendTo(orderNode),
					orderStatus = $('<div><strong></strong></div>').addClass('order-status ' + statusClass).appendTo(orderNode).find('strong').text(statusText),
					orderDetails = $('<div/>').addClass('order-details').text(detailsText).appendTo(orderNode);
				nodeList.append(orderNode);
			});	
			parent.addClass('has-orders');
		} else {
			parent.removeClass('has-orders');
		}
	}	
	
	handlers.applyMtGoxData = function applyMtGoxData(section, data) {
		applyFunds(section, data);
		applyOrderData(section, data.orders);
		loopTickers(section);
		activateSection(section);
	};
	
	handlers.applyMtGoxOrderResponse = function applyMtGoxOrderResponse(section, response) {
		updateStatus(section, 'success', response.status.replace('<br>',''));
		applyOrderData(section, response.orders);
		applyFunds(section, response);
		applyTickerData(section, response.ticker);
	};
	
	function onFormSubmit(event) {
		event.preventDefault();
		var form = $(this), 
			section = form.closest('section'),
			url = form.attr('action'),
			args = form.serialize(),
			status = form.data('status') || 'Please wait...',
			handler = handlers[form.data('handler')],
			union = form.data('union');
		if (union) {
			args = [args, find(union, section).serialize()].join('&');
		}
		updateStatus(section, 'working', status);
		if (url) {
			$.post(url, args).done(function(status){
				if (status.error) {
					updateStatus(section, 'error', status.error);
				} else {
					if (setting('save_state')) { form.saveFormState(); }
					handler(section, status);
				}
			});
		} else {
			handler(section);
		}
	}
	
	function attachDelegates() {
		// wire up settings
		find('#settings').loadFormState().delegate('input', 'change', saveSettings);
		// wire up active forms
		var forms = find('form').live('submit', onFormSubmit);
		if (setting('save_state')) { forms.loadFormState(); }
		if (setting('auto_login')) { forms.filter('.inactive').trigger('submit'); }
		// refresh the order on order changes
		find('.order-price, .order-qty').live('keyup', function(){
			var section = $(this).closest('section');
			refreshOrder(section);
		});
		// modify disabled on market toggle
		find('.order-market, .order-type').live('change', function(){
			var box = $(this), section = $(this).closest('section');
			box.siblings('.order-price').prop('disabled', box.prop('checked'));
			refreshOrder(section);
		});
	}
	
	loader.ready(attachDelegates);
	
})(window, document, window.head, window.jQuery);