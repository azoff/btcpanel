/*global window */

(function($, cache){
	
	function unserialize(querystring) {
        var vars = querystring.split("&"), query = {}, i, pair;
        for (i = 0; i < vars.length; i++) {
            pair = vars[i].split("=");
            query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
        return query;
    }

	$.fn.saveFormState = function() {
		this.each(function(){
			var form = $(this), 
				key = form.attr('id'),
				data = form.serialize();
			cache.set(key, data);
		});
		return this;
	};
	
	$.fn.loadFormState = function(submit) {
		this.each(function(){
			var form = $(this), 
				key = form.attr('id'),
				data = cache.get(key);
			if (data) {
				data = unserialize(data);
				$.each(data, function(name, value){
					var input = form.find('[name=' + name + ']');
					if (input.attr('type') === 'checkbox') {
						input.prop('checked', true);
					} else {
						input.val(value);
					}
				});
				if (submit) {
					form.trigger('submit');
				}
			}
		});
		return this;
	};
	
})(window.jQuery, window.store);