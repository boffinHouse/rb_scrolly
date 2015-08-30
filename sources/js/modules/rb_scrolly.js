(function(){
	'use strict';

	var rb = window.rb;
	var $ = rb.$;

	var docElem = document.documentElement;

	var transforms = {
		rotateX: 1,
		rotateY: 1,
		rotateZ: 1,
		translateX: 1,
		translateY: 1,
		translateZ: 1,
		scaleX: 1,
		scaleY: 1,
		scaleZ: 1,
		skewX: 1,
		skewY: 1,
	};

	rb.life.Widget.extend('scrolly', {
		defaults: {
			min: '100@0',
			max: '100%@-100%',
			disabled: false,
			once: false,
			restDisabled: true,
		},
		init: function(element){
			this._super(element);

			this.parsePositions();
			this.entered = false;
			this.progress = NaN;

			this.onprogress = $.Callbacks();

			this.scrollingElement = rb.getScrollingElement();

			this.updateChilds = rb.rAF(this.updateChilds, true);
			this.changeState = rb.rAF(this.changeState, true);
			this.onprogress.fireWith = rb.rAF(this.onprogress.fireWith);

			this.setupChilds();
			this.checkPosition = this.checkPosition.bind(this);
			this.calculateLayout = this.calculateLayout.bind(this);

			this.calculateLayout();
		},
		parsePositions: function(){
			this.parsedMin = this.parsePosition(this.options.min);
			this.parsedMax = this.parsePosition(this.options.max);
		},
		parsePosition: function(val){
			val = val.split('@');

			return {
				element: {
					val:  parseFloat(val[0]),
					unit: (val[0]).indexOf('%') != -1 ? '%' : 'px',
				},
				container: {
					val: parseFloat(val[1] || '0'),
					unit: (val[1] || '').indexOf('%') != -1 ? '%' : 'px',
				},
				extra: parseFloat(val[val.length -1].split('#') || '0')
			};
		},
		calculateOffset: function(element, definition){
			var offset = definition.val || 0;

			if(offset && definition.unit == '%'){
				offset = element.clientHeight * (offset / 100);
			}
			return offset;
		},
		calculateLayout: function(){

			if(this.options.disabled){return;}
			var box = this.element.getBoundingClientRect();

			this.minScroll = box.top + this.scrollingElement.scrollTop + this.parsedMin.extra;
			this.maxScroll = this.minScroll + this.parsedMax.extra;

			this.maxScroll += this.calculateOffset(this.element, this.parsedMin.element);
			this.maxScroll += this.calculateOffset(docElem, this.parsedMin.container);

			this.minScroll += this.calculateOffset(this.element, this.parsedMax.element);
			this.minScroll += this.calculateOffset(docElem, this.parsedMax.container);

			this.checkPosition();
		},
		checkPosition: function(){
			var that;
			if(this.options.disabled){return;}
			var progress;
			var pos = this.scrollingElement.scrollTop;
			var shouldEnter = this.minScroll <= pos && this.maxScroll >= pos;

			if(shouldEnter || (this.progress !== 0 && this.progress !== 1)){
				progress = Math.max(Math.min((pos - this.minScroll) / (this.maxScroll - this.minScroll), 1), 0);
				this.progress = progress;
				this.updateChilds();
				this.onprogress.fireWith(this, [progress]);

				if(this.options.once === true && this.progress === 1){
					that = this;
					shouldEnter = true;
					rb.rAFQueue.add(function(){
						that.destroy();
					});
				}
			}

			if(this.entered != shouldEnter){
				this.changeState(shouldEnter);
			}
		},
		changeState: function(shouldEnter){
			if(this.entered != shouldEnter){
				this.entered = shouldEnter;
				this.element.classList[shouldEnter ? 'add' : 'remove']('is-in-scrollrange');
				this.$element.trigger('scrollquerychange');

				if(this.options.once == 'entered'){
					this.destroy();
				}
			}
		},
		setupChilds: function(){
			var that = this;
			this.childs = this.$element.find('.scrolly-element').get();
			this.childAnimations = this.childs.map(function(elem){
				var prop, value;
				var styles = getComputedStyle(elem, null);
				var elemStyle = elem.style;
				var options = {
					start: {},
					end: Object.assign({}, that.parseCSSOptions(elem), that.parseHTMLOptions(elem))
				};

				for(prop in options.end){
					if(prop == 'easing'){
						options.easing = rb.addEasing(options.end[prop]);
					} else {
						options.start[prop] = $.css(elem, prop, true, styles);
					}
				}
				return options;
			});
		},
		updateChilds: function(){
			var eased, i, len, animOptions, elem, eStyle, prop, value;


			for(i = 0, len = this.childs.length; i < len; i++){
				elem = this.childs[i];
				animOptions = this.childAnimations[i];
				eased = animOptions.easing ?
					animOptions.easing(this.progress) :
					this.progress
				;
				eStyle = elem.style;

				for(prop in animOptions.start){
					value = (animOptions.end[prop] - animOptions.start[prop]) * eased + animOptions.start[prop];

					if(prop in eStyle){
						if(!$.cssNumber[prop]){
							value += 'px';
						}
						eStyle[prop] = value;
					} else {
						elem[prop] = value;
					}
				}
			}

		},
		onceAttached: function(){

		},
		setOption: function(name, value){
			this._super(name, value);
			if(name == 'disabled' || name == 'restDisabled' && this.options.disabled && this.options.restDisabled){
				this.changeState(false);
			} else if(name == 'min' || name == 'max'){
				this.parsePositions();
				this.calculateLayout();
			}
		},
		attached: function(){
			window.addEventListener('scroll', this.checkPosition);
			rb.resize.on(this.calculateLayout);
		},
		detached: function(){
			window.removeEventListener('scroll', this.checkPosition);
			rb.resize.off(this.calculateLayout);
		},
	});
})();
