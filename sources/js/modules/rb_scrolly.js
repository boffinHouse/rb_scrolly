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

	var Scrolly = rb.life.Widget.extend('scrolly', {
		defaults: {
			from: '-100eh',
			to: '100vh',
			disabled: false,
			once: false,
			restDisabled: true,
		},
		init: function(element){
			this._super(element);

			this.parseOffsets();
			this.entered = false;
			this.progress = -1;

			this.onprogress = $.Callbacks();

			this.scrollingElement = rb.getScrollingElement();

			this.updateChilds = rb.rAF(this.updateChilds, true);
			this.changeState = rb.rAF(this.changeState, true);
			this.onprogress.fireWith = rb.rAF(this.onprogress.fireWith);

			this.checkPosition = this.checkPosition.bind(this);
			this.calculateLayout = this.calculateLayout.bind(this);

			this.calculateLayout();
		},
		parseOffsets: function(){
			this.parsedFrom = this.parseOffset(this.options.from);
			this.parsedTo = this.parseOffset(this.options.to);
		},
		parseOffset: function(val){
			var prop;
			val = ('' + val).replace(Scrolly.regWhite, '');
			var match = Scrolly.regCalc.exec(val);
			var parsedPos = {};

			while(match != null){
				prop = Scrolly.knownUnits[match[3]] ? match[3] : 'px';
				parsedPos[prop] = parseFloat(match[2]);
				match = Scrolly.regCalc.exec(val);
			}

			return parsedPos;
		},
		addOffset: function(offset){
			var prop, element, dimProp;
			var value = 0;
			for(prop in offset){
				if(prop == 'eh' || prop == 'ev'){
					element = this.element;
				} else if(prop == 'vw' || prop == 'vh'){
					element = docElem;
				}

				if(element){
					dimProp = prop.charAt(1) == 'w' ?
						'clientWidth' :
						'clientHeight'
					;
					value += element[dimProp] / 100 * offset[prop];
				} else {
					value += offset[prop];
				}
			}
			return value;
		},
		calculateLayout: function(){

			if(this.options.disabled){return;}
			var box = this.element.getBoundingClientRect();

			this.minScroll = box.top + this.scrollingElement.scrollTop;
			this.maxScroll = this.minScroll;

			this.minScroll -= this.addOffset(this.parsedTo);
			this.maxScroll -= this.addOffset(this.parsedFrom);

			this.checkPosition();
		},
		checkPosition: function(){
			var that, wasProgress;
			if(this.options.disabled){return;}
			var progress;
			var pos = this.scrollingElement.scrollTop;
			var shouldEnter = this.minScroll <= pos && this.maxScroll >= pos;

			if(shouldEnter || (this.progress !== 0 && this.progress !== 1)){
				progress = Math.max(Math.min((pos - this.minScroll) / (this.maxScroll - this.minScroll), 1), 0);
				wasProgress = this.progress;
				this.progress = progress;

				if(wasProgress == progress || (wasProgress == -1 && !progress)){return;}

				if(!this.childs || !this.childAnimations){
					this.setupChilds();
				}

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
		getCssValue: function(elem, prop, options, styles){
			var value = {
				from: 0,
				to: 1,

			};
			var endValue = options.end[prop];
			if(typeof endValue == 'object'){

				Object.assign(value, endValue);
				options.end[prop] = endValue.value || 0;

				if('start' in endValue){
					value.value = endValue.start;
				}
			}

			value.value = value.value != null ? value.value : $.css(elem, prop, 1, styles);

			if(typeof value.value == 'string' && typeof options.end[prop] == 'string'){
				value.template = value.value;
				value.value = (value.value.match(Scrolly.regNumber) || [0]).map(Scrolly.toNumber);
				options.end[prop] = (options.end[prop].match(Scrolly.regNumber) || [0]).map(Scrolly.toNumber);
			}
			return value;
		},
		setupChilds: function(){
			var that = this;
			this.childs = this.$element.find('.scrolly-element').get();
			this.childAnimations = this.childs.map(function(elem){
				var prop;
				var styles = getComputedStyle(elem, null);

				var options = {
					start: {},
					end: Object.assign({}, that.parseCSSOptions(elem), that.parseHTMLOptions(elem)),
					delays: {}
				};

				for(prop in options.end){
					if(prop == 'easing'){
						options.easing = rb.addEasing(options.end[prop]);
					} else {
						options.start[prop] = that.getCssValue(elem, prop, options, styles);
					}
				}
				return options;
			});
			console.log(this.childAnimations);
		},
		updateChilds: function(){
			var eased, i, len, animOptions, elem, eStyle, prop, value, option, isString, i2;

			for(i = 0, len = this.childs.length; i < len; i++){
				elem = this.childs[i];
				animOptions = this.childAnimations[i];
				eased = animOptions.easing ?
					animOptions.easing(this.progress) :
					this.progress
				;
				eStyle = elem.style;

				for(prop in animOptions.start){
					option = animOptions.start[prop];
					if((isString = option.template)){
						i2 = 0;
						value = option.template.replace(Scrolly.regNumber, function(){
							var value = (animOptions.end[prop][i2] - option.value[i2]) * eased + option.value[i2];
							i2++;
							return value;
						});
					} else {
						value = (animOptions.end[prop] - option.value) * eased + option.value;
					}

					if(prop in eStyle){
						if(!isString && !$.cssNumber[prop]){
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
			} else if(name == 'from' || name == 'to'){
				this.parseOffsets();
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

	Scrolly.regWhite = /\s/g;
	Scrolly.toNumber = function(i){
		return parseFloat(i) || 0;
	};
	Scrolly.regNumber = /(\d+[\.\d]*)/g;
	Scrolly.regStyleSplit = /\s*;\s*/g;
	Scrolly.regCalc = /(([+-]*\d+[\.\d]*)(px|vh|eh|vw|ew))/g;
	Scrolly.knownUnits = {vh: 1, eh: 1, vw: 1, ew: 1};
})();
