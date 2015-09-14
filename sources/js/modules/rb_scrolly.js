(function(){
	'use strict';

	var rb = window.rb;
	var $ = rb.$;

	var docElem = document.documentElement;
	var pseudoExpando = rb.Symbol('_rbPseudoExpando');

	var Scrolly = rb.life.Widget.extend('scrolly', {
		defaults: {
			switchedOff: false,
			from: '-100eh',
			to: '100vh',
			once: false,
			restSwitchedOff: true,
			childSel: '.scrolly-element',
		},
		init: function(element){
			this._super(element);

			this.minScroll = Number.MAX_VALUE;
			this.maxScroll = -1;

			this.checkTime = 666 + (666 * Math.random());


			this.entered = false;
			this.progress = -1;

			this.onprogress = $.Callbacks();

			this.scrollingElement = rb.getScrollingElement();

			this.updateChilds = rb.rAF(this.updateChilds, true);
			this.changeState = rb.rAF(this.changeState, true);
			this.onprogress.fireWith = rb.rAF(this.onprogress.fireWith);

			this.checkPosition = this.checkPosition.bind(this);
			this.calculateLayout = this.calculateLayout.bind(this);
			this.reflow = rb.throttle(function(){
				this.checkChildReflow();
				this.calculateLayout();
			}, {that: this});

			this.parseOffsets();
			this.calculateLayout();
		},
		setOption: function(name, value){
			this._super(name, value);
			if(name == 'switchedOff' || name == 'restSwitchedOff' && this.options.switchedOff && this.options.restSwitchedOff){
				this.changeState(false);
				this.updateChilds(true);
				this.progress = -1;
			} else if(name == 'from' || name == 'to' || (name == 'switchedOff' && !value)){
				this.parseOffsets();
				this.calculateLayout();
			}
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

			if(this.options.switchedOff){return;}
			var box = this.element.getBoundingClientRect();

			this.lastCheck = Date.now();

			if(!box.top && !box.bottom && !box.right && !box.left){return;}

			this.minScroll = box.top + this.scrollingElement.scrollTop;
			this.maxScroll = this.minScroll;

			this.minScroll -= this.addOffset(this.parsedTo);
			this.maxScroll -= this.addOffset(this.parsedFrom);

			this.checkPosition();
		},
		checkPosition: function(){
			var that, wasProgress, shouldEnter;
			if(this.options.switchedOff){return;}
			var progress;
			var pos = this.scrollingElement.scrollTop;

			if(Date.now() - this.lastCheck > this.checkTime){
				this.lastCheck = Date.now();
				setTimeout(this.calculateLayout, 99 * Math.random());
			}

			shouldEnter = this.minScroll <= pos && this.maxScroll >= pos;

			if(shouldEnter || (this.progress !== 0 && this.progress !== 1)){
				progress = Math.max(Math.min((pos - this.minScroll) / (this.maxScroll - this.minScroll), 1), 0);
				wasProgress = this.progress;
				this.progress = progress;

				if(wasProgress == progress || (wasProgress == -1 && !progress)){return;}

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
				this._trigger();

				if(this.options.once == 'entered'){
					this.destroy();
				}
			}
		},
		getCssValue: function(elem, prop, options, styles){
			var value = {};
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
			this.childs = this.$element.find(this.options.childSel).get();
			this.childAnimations = this.childs.map(function(elem){
				var prop;
				var styles = rb.getStyles(elem);

				var options = {
					start: {},
					end: Object.assign({}, that.parseCSSOptions(elem), that.parseHTMLOptions(elem)),
					from: 0,
					to: 1,
				};

				elem[pseudoExpando] = rb.getStyles(elem, '::after').content;

				for(prop in options.end){
					if(prop == 'easing'){
						options.easing = rb.addEasing(options.end[prop]);
					} else if(prop == 'from' || prop == 'to'){
						options[prop] = options.end[prop];
					} else {
						options.start[prop] = that.getCssValue(elem, prop, options, styles);
					}
				}
				return options;
			});
		},
		checkChildReflow: function(){
			var ret = false;

			if(this.options.watchCSS && this.childs && this.childs.length && !this.options.switchedOff){
				this.childs.forEach(function(elem){
					if(!ret && elem[pseudoExpando] != rb.getStyles(elem, '::after').content){
						ret = true;
					}
				});
			}

			if(ret){
				this.updateChilds._rbUnrafedFn(true);
				this.progress = -1;
			}

			return ret;
		},
		updateChilds: function(empty){
			var eased, i, len, animOptions, elem, eStyle, prop, value, option, isString, i2, retFn, progress;
			empty = empty === true;

			if(!this.childs || !this.childAnimations){
				if(empty){
					return;
				}
				this.setupChilds();
			}

			for(i = 0, len = this.childs.length; i < len; i++){
				elem = this.childs[i];
				animOptions = this.childAnimations[i];
				progress = this.progress;
				eStyle = elem.style;

				if(!empty){
					if(animOptions.from > progress){
						progress = 0;
					} else if(animOptions.to < progress){
						progress = 1;
					} else if(animOptions.to < 1 || animOptions.from > 0){
						progress -= animOptions.from;
						progress *= 1 / (1 - (1 - animOptions.to) - animOptions.from);
					}

					eased = animOptions.easing ?
						animOptions.easing(progress) :
						progress
					;
				}

				for(prop in animOptions.start){
					option = animOptions.start[prop];
					value = option.value;

					if(!empty){
						if((isString = option.template)){
							i2 = 0;
							if(!retFn){
								/*jshint loopfunc: true */
								retFn = function(){
									var value = (animOptions.end[prop][i2] - option.value[i2]) * eased + option.value[i2];
									i2++;
									if(prop == 'backgroundColor'){
										value = Math.round(value);
									}
									return value;
								};
							}
							value = option.template.replace(Scrolly.regNumber, retFn);
						} else {
							value = (animOptions.end[prop] - option.value) * eased + option.value;
						}
					}

					if(prop in eStyle){
						if(!isString && !$.cssNumber[prop]){
							value += 'px';
						}
						eStyle[prop] = empty ? '' : value;
					} else {
						elem[prop] = value;
					}
				}
			}
			if(empty){
				this.childs = null;
				this.childAnimations = null;
			}
		},
		onceAttached: function(){

		},
		attached: function(){
			window.addEventListener('scroll', this.checkPosition);
			rb.resize.on(this.reflow);
			clearInterval(this.layoutInterval);
			this.layoutInterval = setInterval(this.reflow, Math.round(9999 + (999 * Math.random())));
		},
		detached: function(){
			window.removeEventListener('scroll', this.checkPosition);
			rb.resize.off(this.reflow);
			clearInterval(this.layoutInterval);
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
