(function(){
	'use strict';

	var rb = window.rb;
	var $ = rb.$;

	var docElem = document.documentElement;

	var Scrolly = (rb.widgets._childfx || rb.Widget).extend('scrolly', {
		defaults: {
			switchedOff: false,
			from: '-100eh',
			to: '100vh',
			once: false,
			restSwitchedOff: true,
			childSel: 'find(.scrolly-element)',
		},
		statics: {
			regWhite: /\s/g,
			regCalc: /(([+-]*\d+[\.\d]*)(px|vh|eh|vw|ew))/g,
			knownUnits: {vh: 1, eh: 1, vw: 1, ew: 1},
		},
		init: function(element){
			debugger;
			this._super(element);

			this.minScroll = Number.MAX_VALUE;
			this.maxScroll = -1;

			this.checkTime = 999 + (999 * Math.random());

			this.entered = false;
			this.progress = -1;

			this.onprogress = $.Callbacks();

			this.scrollingElement = rb.getScrollingElement();

			this.updateChilds = rb.rAF(this.updateChilds || $.noop, true);
			this.changeState = rb.rAF(this.changeState, true);
			this.onprogress.fireWith = rb.rAF(this.onprogress.fireWith);

			this.checkPosition = this.checkPosition.bind(this);
			this.calculateLayout = this.calculateLayout.bind(this);
			this.reflow = rb.throttle(function(){
				if(this.checkChildReflow){
					this.checkChildReflow();
				}
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
})();
