import { LitElement, html } from 'lit-element';
import { hasConfigOrEntityChanged, fireEvent } from 'custom-card-helpers';
import './charger-card-editor';
import localize from './localize';
import styles from './styles';
import * as cconst from './const';

// let easee = await import('./const_easee.js');
import * as easee from './const_easee.js';


// if (!customElements.get('ha-icon-button')) {
//   customElements.define(
//     'ha-icon-button',
//     class extends customElements.get('paper-icon-button') {}
//   );
// }

class ChargerCard extends LitElement {
  static get properties() {
    return {
      hass: Object,
      config: Object,
      requestInProgress: Boolean,
    };
  }
  static async getConfigElement() {
    return document.createElement('charger-card-editor');
  }

  static getStubConfig(hass, entities) {
    const [chargerEntity] = entities.filter(
      (eid) => eid.substr(0, eid.indexOf('.')) === 'sensor'
    );

    return {
      entity: chargerEntity || '',
      image: 'default',
    };
  }

  static get styles() {
    return styles;
  }

  get entity() {
    return this.hass.states[this.config.entity];
  }

  // get chargerId() {
  //   return this.hass.states[this.config.entity].attributes['id'];
  // }

  // get chargerDomain() {
  //   // if (this.config.domain === undefined) {
  //   return easee.DOMAIN;
  //   // }
  // }

  // get usedChargerLimit() {
  //   const {
  //     dynamicChargerCurrent,
  //     dynamicCircuitCurrent,
  //     maxChargerCurrent,
  //     maxCircuitCurrent,
  //   } = this.getEntities();
  //   const circuitRatedCurrent = this.hass.states[this.config.entity].attributes[
  //     'circuit_ratedCurrent'
  //   ];
  //   const usedChargerLimit = Math.min(
  //     this.getEntityState(dynamicChargerCurrent),
  //     this.getEntityState(dynamicCircuitCurrent),
  //     this.getEntityState(maxChargerCurrent),
  //     this.getEntityState(maxCircuitCurrent),
  //     circuitRatedCurrent
  //   );
  //   return usedChargerLimit;
  // }

  get image() {
    let image;
    if (this.config.customImage !== undefined && this.config.customImage !== null && this.config.customImage !== '') {
      // For images in www try path \local\image.png
      image = this.config.customImage;
    } else {
      let imageSel = this.config.chargerImage || cconst.DEFAULTIMAGE;
      image = cconst.CHARGER_IMAGES.find(({ name }) => {
        if (name === imageSel) {
          return name;
        }
      }).img;
    }
    return image;
  }

  get customCardTheme() {
    if (this.config.customCardTheme === undefined) {
      return cconst.DEFAULT_CUSTOMCARDTHEME;
    }
    return this.config.customCardTheme;
  }

  get showLeds() {
    if (this.config.show_leds === undefined) {
      return true;
    }
    return this.config.show_leds;
  }

  get showName() {
    if (this.config.show_name === undefined) {
      return true;
    }
    return this.config.show_name;
  }

  get showStatus() {
    if (this.config.show_status === undefined) {
      return true;
    }
    return this.config.show_status;
  }

  get showStats() {
    if (this.config.show_stats === undefined) {
      return true;
    }
    return this.config.show_stats;
  }

  get showCollapsibles() {
    if (this.config.show_collapsibles === undefined) {
      return true;
    }
    return this.config.show_collapsibles;
  }

  get showToolbar() {
    if (this.config.show_toolbar === undefined) {
      return true;
    }
    return this.config.show_toolbar;
  }

  get compactView() {
    if (this.config.compact_view === undefined) {
      return false;
    }
    return this.config.compact_view;
  }

  get currentlimits() {
    if (this.config.currentlimits !== undefined && Array.isArray(this.config.currentlimits)) {
      return this.config.currentlimits;
    }
    return cconst.CURRENTLIMITS;
  }

  get statetext() {
    if (this.config.statetext !== undefined && typeof this.config.statetext == 'object') {
      return this.config.statetext;
    }
    return [{}];
  }


  getCardData(configgroup) {
    var entities = {};

    if (configgroup === undefined || configgroup === null) {
      return null;
    } else if(typeof configgroup == 'object'){
      for (let [key, val] of Object.entries(configgroup)) {
        if (typeof val == 'object' && 'entity_id' in val) {
          // Get entity
          var entity = this.getEntity(val['entity_id']);
          if (entity !== undefined && entity !== null ) {
            var entityinfo = { 'entity': entity };

            //Set defaults if not given in config
            if (val['unit'] === undefined) { entityinfo['unit'] = entity.attributes['unit_of_measurement'] || null };
            if (val['unit_show'] === undefined) { entityinfo['unit_show'] = false };
            if (val['unit_showontext'] === undefined) { entityinfo['unit_showontext'] = false };
            if (val['text'] === undefined) { entityinfo['text'] = entity.attributes['friendly_name'] || null };
            if (val['icon'] === undefined) { entityinfo['icon'] = this.getEntityIcon(entity) };
            if (val['round'] === undefined) { entityinfo['round'] = false };
            if (val['type'] === undefined) { entityinfo['type'] = 'info' };
            // service
            // service_data

            // Use attribute if given in config
            entityinfo['useval'] = 'attribute' in val && val['attribute'] in entity.attributes ? entity.attributes[val['attribute']] : entity.state || null;

            //Apply rounding of number if specified, round to zero decimals if other than integer given (for instance true)
            if (val['round'] !== undefined) {
              var decimals = Number.isInteger(val['round']) ? val['round'] : 0;
              entityinfo['useval'] = this.round(entityinfo['useval'], decimals);
            }

            entities[key] = Object.assign(entityinfo, val);
          }
        } else if (typeof val == 'object') {
          // For states and similar
          entities[key] = this.getCardData(val);
        }
      }
    } else {
          // For strings and non-objects
          entities = configgroup;
        }
    // console.log(entities);
    return entities;
  }


  getEntityIcon(entity) {
    if (entity === undefined || entity === null || typeof entity !== 'object') {
        return null;
    } else if ('icon' in entity.attributes) {
        return entity.attributes['icon'];
    } else if ('device_class' in entity.attributes) {
        //TODO: Find better way to get deviceclass icons
        return cconst.DEVICECLASS_ICONS[entity.attributes['device_class']] || null;
    }
    return null;
  }

  getCollapsibleButton(button, deftext, deficon) {
    let btns = this.config.collapsiblebuttons;
    try {
      return { text: btns[button].text, icon: btns[button].icon };
    } catch (err) {
      return { text: deftext, icon: deficon };
    }
  }

  round(value, decimals) {
    try{
      return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    } catch (err){
      return null;
    }
  }

  getEntity(entity_name) {
    try {
      return this.hass.states[entity_name];
    } catch (err) {
      return null;
    }
  }

  // getEntityState(entity) {
  //   try {
  //     return entity.state;
  //   } catch (err) {
  //     return null;
  //   }
  // }

  // getEntityAttribute(entity_name, attribute = null) {
  //   try {
  //     if (attribute == null) {
  //       return this.hass.states[entity_name].attributes;
  //     } else {
  //       return this.hass.states[entity_name].attributes[attribute];
  //     }
  //   } catch (err) {
  //     return null;
  //   }
  // }

  setConfig(config) {
    if (!config.entity) {
      throw new Error(localize('error.missing_entity'));
    }
    this.config = config;
  }

  getCardSize() {
    return 2;
  }

  shouldUpdate(changedProps) {
    return hasConfigOrEntityChanged(this, changedProps, true); //TODO: Probably not efficient to force update here?
  }

  updated(changedProps) {
    if (
      changedProps.get('hass') &&
      changedProps.get('hass').states[this.config.entity].state !==
      this.hass.states[this.config.entity].state
    ) {
      this.requestInProgress = false;
    }
  }

  handleMore(entity = this.entity) {
    fireEvent(
      this,
      'hass-more-info',
      {
        entityId: entity.entity_id,
      },
      {
        bubbles: true,
        composed: true,
      }
    );
  }

  setServiceData(service, isRequest, e) {
    switch (service) {
      case easee.SERVICES.chargerMaxCurrent: {
        const current = e.target.getAttribute('value');
        return this.callService(service, isRequest, { current });
      }
      case easee.SERVICES.chargerDynCurrent: {
        const current = e.target.getAttribute('value');
        return this.callService(service, isRequest, { current });
      }
      case easee.SERVICES.circuitOfflineCurrent: {
        const currentP1 = e.target.getAttribute('value');
        return this.callService(service, isRequest, { currentP1 });
      }
      case easee.SERVICES.circuitMaxCurrent: {
        const currentP1 = e.target.getAttribute('value');
        return this.callService(service, isRequest, { currentP1 });
      }
      case easee.SERVICES.circuitDynCurrent: {
        const currentP1 = e.target.getAttribute('value');
        return this.callService(service, isRequest, { currentP1 });
      }
    }
  }

  callService(service, isRequest = true, servicedata = {}, domain = null) {
    if (service === undefined || service === null) {
      console.error("Trying to call an empty service - please check your card configuration.");
      this.hass.callService("persistent_notification", "create", { title: "No service", message: "No service defined for this action." });
    } else {
      service = service.split(".");
      // console.log(service[0])
      // console.log(service[1])
      // console.log(servicedata)
      this.hass.callService(service[0], service[1], servicedata[0]);
      // this.hass.callService(service[0], service[1], {
      //   charger_id: this.chargerId,
      //   ...options,
      // });
      if (isRequest) {
        // this.requestInProgress = true; //TODO: Removed, must be improved to check all sensors
        this.requestUpdate();
      }
    }
  }

  renderImage(state) {
    let compactview = '';
    if (this.compactView) {
      compactview = '-compact';
    }

    if (!this.image) {
      return html``;
    }
    return html` <img
        class="charger${compactview}"
        src="${this.image}"
        @click="${() => this.handleMore()}"
        ?more-info="true"
      />${this.renderLeds(state)}`;
  }

  renderLeds(state) {
    if (!this.showLeds) {
      return html``;
    }
    let carddatas = this.getCardData(this.config["smartcharging"]);
    let chargingmode = 'normal';
    if (carddatas !== null && carddatas !== undefined && typeof carddatas === 'object') {
      chargingmode = carddatas[0].entity.state == 'on' ? 'smart' : 'normal';
    }
    let imageled = easee.EASEE_LEDIMAGES[chargingmode][state] || easee.EASEE_LEDIMAGES[chargingmode]['DEFAULT'];
    let compactview = this.compactView ? '-compact' : '';
    return html`<img class="charger led${compactview}" src="${imageled}" @click="${() => this.handleMore(carddatas.entity)}"?more-info="true"/> `;
  }

  renderStats(state) {
    /* SHOW DATATABLE */
    if (!this.showStats) {
      return html``;
    }
    let compactview = this.compactView ? '-compact' : '';
    const stats = this.getCardData(this.config.stats)
    const statsList = (stats !== undefined && stats !== null) ? stats[state] || stats['default'] :[];

    return html`<div class="stats${compactview}">
      ${Object.values(statsList).map(stat => {
          if (!stat.entity_id && !stat.attribute) {
            return html``;
          }
          try {
            return html`
            <div
              class="stats-block"
              @click="${() => this.handleMore(stat.entity)}"
              ?more-info="true"
            >
              <span class="stats-value">${stat.useval}</span>
              ${stat.unit}
              <div class="stats-subtitle">${stat.text}</div>
            </div>
          `;
          } catch (err) {
            return null;
          }
        })
      }
      </div>`;
    }


  renderName() {
    if (!this.showName) {
      return html``;
    }

    let carddata_name = this.getCardData(this.config["name"]);
    let carddata_location = this.getCardData(this.config["location"]);
    var name = "NAME";
    var location = "LOCATION";
    var moreEntity = null;
    let compactview = this.compactView ? '-compact' : '';

    if (carddata_name !== null && carddata_name !== undefined) {
      name = typeof carddata_name == 'object' ? carddata_name[0].useval : carddata_name;
      moreEntity = typeof carddata_name == 'object' ? carddata_name[0].entity : null;
    }
    if (carddata_location !== null && carddata_location !== undefined) {
      location = typeof carddata_location == 'object' ? carddata_location[0].useval : carddata_location;
    }
    return html`
      <div
        class="charger-name${compactview}"
        @click="${() => this.handleMore(moreEntity)}"
        ?more-info="true"
      >
        ${location} - ${name}
      </div>
    `;
  }


  renderStatus() {
    if (!this.showStatus) {
      return html``;
    }
    let carddata_status = this.getCardData(this.config["status"]);
    let carddata_substatus = this.getCardData(this.config["substatus"]);
    var status = "STATUS";
    var substatus = "SUBSTATUS";
    var entityStatus = null;
    var entitySubstatus = null;
    let compactview = this.compactView ? '-compact' : '';

    if (carddata_status !== null && carddata_status !== undefined) {
      status = typeof carddata_status == 'object' ? carddata_status[0].useval : carddata_status;
      entityStatus = typeof carddata_status == 'object' ? carddata_status[0].entity : null;
    }
    if (carddata_substatus !== null && carddata_substatus !== undefined) {
      substatus = typeof carddata_substatus == 'object' ? carddata_substatus[0].useval : carddata_substatus;
      entitySubstatus = typeof carddata_substatus == 'object' ? carddata_substatus[0].entity : null;
    }

    //Localize
    status = this.statetext[0][status] || localize("status." + status) || status;
    substatus = localize("substatus." + substatus) || substatus;

    return html`
      <div class="status${compactview}" @click="${() => this.handleMore(entityStatus)}"?more-info="true">
        <span class="status-text${compactview}" alt=${status}>${status}</span>
        <ha-circular-progress .active=${this.requestInProgress} size="small"></ha-circular-progress>
        <div class="status-detail-text${compactview}" alt=${substatus} @click="${() => this.handleMore(entitySubstatus)}"?more-info="true">
          ${substatus}
        </div>
      </div>
    `;
  }


  renderCollapsible(group, icon, tooltip, style, itemtype) {
    /* SHOW COLLAPSIBLES */
    if (!this.showCollapsibles) {
      return html``;
    }
    // TODO: CONDITIONAL SHOWING OF UPDATEAVAILABLE ETC, INCLUDING SERVICE CALLS AND USED LIMIT (CALCVAL)
    // let updateAvailableState = this.getEntityState(updateAvailable) || 'off';

    // ${this.renderCollapsibleDropDownItems(
    //   maxChargerCurrent,
    //   easee.SERVICES.chargerMaxCurrent,
    //   'Max Charger',
    //   undefined,
    //   'Max Charger Limit',
    //   true
    // )}

    let carddatas = this.getCardData(this.config[group]);
    return html`
      <div class="wrap-collabsible${style}">
        <input id="collapsible${style}" class="toggle${style}" type="checkbox" />
        <label for="collapsible${style}" class="lbl-toggle${style}">
          <div class="tooltip-right">
            <ha-icon icon="${icon}"></ha-icon>
            <span class="tooltiptext-right">${localize(tooltip)}</span>
          </div>
        </label>
        <div class="collapsible-content${style}">
          <div class="content-inner${style}">
            ${carddatas !== null ? Object.values(carddatas).map(carddata => {return this.renderCollapsibleItems(carddata, itemtype);}):localize('error.missing_group')}
          </div>
        </div>
      </div>
    `;
  }

  renderCollapsibleItems(carddata, itemtype='') {
    if (carddata === null || carddata === undefined || typeof carddata !== 'object') {
      return html``;
    }

    if (itemtype === '' || itemtype === 'info') {
      var options = "";
      return html`
        <div class="collapsible-item"
          @click="${() => this.handleMore(carddata.entity)}"
          ?more-info="true"
        >
          <div class="tooltip">
            <ha-icon icon="${carddata.icon}"></ha-icon>
            <br />${carddata.useval} ${carddata.unit_show ? carddata.unit : ''}
            <span class="tooltiptext">${carddata.text} ${carddata.unit_showontext ? "(" + carddata.unit + ")" : ''}</span>
          </div>
        </div>
      `;
    }else if (itemtype === 'service') {
        var options = "";
        return html`
          <div class="collapsible-item"
            @click="${() => this.callService(carddata.service, true, carddata.service_data)}"
            ?more-info="true"
          >
            <div class="tooltip">
              <ha-icon icon="${carddata.icon}"></ha-icon>
              <br />${carddata.useval} ${carddata.unit_show ? carddata.unit : ''}
              <span class="tooltiptext">${carddata.text} ${carddata.unit_showontext ? "(" + carddata.unit + ")" : ''}</span>
            </div>
          </div>
        `;

    } else if (itemtype === 'dropdown') {
        const sources = cconst.CURRENTLIMITS;
        let selected = sources.indexOf(carddata.useval);
        return html`
          <paper-menu-button slot="dropdown-trigger" .noAnimations=${true} @click="${(e) => e.stopPropagation()}">
            <paper-button slot="dropdown-trigger">
              <div class="tooltip">
                <ha-icon icon="${carddata.icon}"></ha-icon>
                <br />${carddata.useval} ${carddata.unit_show ? carddata.unit : ''}
                <span class="tooltiptext">${carddata.text} ${carddata.unit_showontext ? "(" +carddata.unit +")" : ''}</span>
              </div>
            </paper-button>
            <paper-listbox slot="dropdown-content" selected=${selected} @click="${(e) => this.setServiceData(carddata.service, true, e)}">
              ${sources.map((item) => html`<paper-item value=${item}>${item}</paper-item>`)}
            </paper-listbox>
          </paper-menu-button>
        `;
    } else {
      return html``;
    }
  }

  renderMainInfoLeftRight(data) {
    let carddatas = this.getCardData(this.config[data]);
    if (carddatas === null || carddatas === undefined || typeof carddatas !== 'object') {
      return html``;
    }

    return html`
      ${carddatas !== null ? Object.values(carddatas).map(carddata => {
        return html`
        <div
        class='infoitems-item'
        @click='${() => this.handleMore(carddata.entity)}'
        ?more-info='true'
      >
        <div class='tooltip'>
          <ha-icon icon='${carddata.icon}'></ha-icon>
          ${carddata.useval} ${carddata.unit_show ? carddata.unit : ''}
          <span class='tooltiptext'>${carddata.text} ${carddata.unit_showontext ? '(' +carddata.unit +')' : ''}</span>
        </div>
      </div>
      `
     }) : ''}
    `;
  }


  renderToolbar(state) {
    /* SHOW TOOLBAR */
    if (!this.showToolbar) {
      return html``;
    }

    var toolbardata_left = this.getCardData(this.config.toolbar_left);
    var toolbardata_right = this.getCardData(this.config.toolbar_right);
    toolbardata_left = toolbardata_left !== null ? toolbardata_left[state] || toolbardata_left.default || [] : [];
    toolbardata_right = toolbardata_right !== null ? toolbardata_right[state] || toolbardata_right.default || [] : [];

    var toolbar_left = Object.values(toolbardata_left).map(btn => {
      return this.renderToolbarButton(btn.service, btn.icon, btn.text, btn.service_data)
    })

    var toolbar_right = Object.values(toolbardata_right).map(btn => {
      return this.renderToolbarButton(btn.service, btn.icon, btn.text, btn.service_data)
    })

    return html`
      <div class="toolbar">
        ${toolbar_left}
        <div class="fill-gap"></div>
        ${toolbar_right}
      </div>
    `;
  }

  renderToolbarButton(service, icon, text, service_data = {},isRequest = true) {
    let useText = '';
    try {
      useText = localize(text);
    } catch (e) {
      useText = text;
    }
    return html`
      <div class="tooltip">
        <ha-icon-button
          title="${useText}"
          @click="${() => this.callService(service, isRequest, service_data)}"
          ><ha-icon icon="${icon}"></ha-icon
        ></ha-icon-button>
        <span class="tooltiptext">${useText}</span>
      </div>
    `;
  }

  renderCompact() {
    const { state } = this.entity;
    return html`
      <ha-card>
        <div class="preview-compact">
          ${this.renderImage(state)}
          <div class="metadata">
            ${this.renderName()} ${this.renderStatus()}
          </div>
          <div class="infoitems">${this.renderMainInfoLeftRight('info_right')}</div>
          ${this.renderStats(state)}
        </div>
        ${this.renderToolbar(state)}
      </ha-card>
    `;
  }

  renderFull() {
    const { state } = this.entity;
    const btn1 = this.getCollapsibleButton('group1', 'common.click_for_limits', 'mdi:speedometer');
    const btn2 = this.getCollapsibleButton('group2', 'common.click_for_info', 'mdi:information');
    const btn3 = this.getCollapsibleButton('group3', 'common.click_for_config', 'mdi:cog');
    return html`
      <ha-card>
        <div class="preview">
          <div class="header">
            <div class="infoitems-left">${this.renderMainInfoLeftRight('info_left')}</div>
            <div class="infoitems">${this.renderMainInfoLeftRight('info_right')}</div>
          </div>
          ${this.renderImage(state)}
          <div class="metadata">
            ${this.renderName()} ${this.renderStatus()}
          </div>
            ${this.renderCollapsible('group1', btn1.icon, btn1.text, '-lim','dropdown')}
            ${this.renderCollapsible('group2', btn2.icon, btn2.text, '-info','info')}
            ${this.renderCollapsible('group3', btn3.icon, btn3.text, '', 'info')}
            ${this.renderStats(state)}
        </div>
        ${this.renderToolbar(state)}
      </ha-card>
    `;
  }

  renderCustomCardTheme() {
    switch (this.customCardTheme) {
      case 'theme_custom': {
        break;
      }
      case 'theme_default': {
        this.style.setProperty('--custom-card-background-color', '#03A9F4');
        this.style.setProperty('--custom-text-color', '#FFFFFF');
        this.style.setProperty('--custom-primary-color', '#03A9F4');
        this.style.setProperty('--custom-icon-color', '#FFFFFF');
        break;
      }
      case 'theme_transp_blue': {
        this.style.setProperty('--custom-card-background-color', 'transparent');
        this.style.setProperty('--custom-text-color', '#03A9F4');
        this.style.setProperty('--custom-primary-color', '#03A9F4');
        this.style.setProperty('--custom-icon-color', '#03A9F4');
        break;
      }
      case 'theme_transp_black': {
        this.style.setProperty('--custom-card-background-color', 'transparent');
        this.style.setProperty('--custom-text-color', 'black');
        this.style.setProperty('--custom-primary-color', 'black');
        this.style.setProperty('--custom-icon-color', 'black');
        break;
      }
      case 'theme_transp_white': {
        this.style.setProperty('--custom-card-background-color', 'transparent');
        this.style.setProperty('--custom-text-color', 'white');
        this.style.setProperty('--custom-primary-color', 'white');
        this.style.setProperty('--custom-icon-color', 'white');
        break;
      }
      case 'theme_lightgrey_blue': {
        this.style.setProperty('--custom-card-background-color', 'lightgrey');
        this.style.setProperty('--custom-text-color', '#03A9F4');
        this.style.setProperty('--custom-primary-color', '#03A9F4');
        this.style.setProperty('--custom-icon-color', '#03A9F4');
        break;
      }
      default: {
        this.style.setProperty('--custom-card-background-color', '#03A9F4');
        this.style.setProperty('--custom-text-color', '#FFFFFF');
        this.style.setProperty('--custom-primary-color', '#03A9F4');
        this.style.setProperty('--custom-icon-color', '#FFFFFF');
        break;
      }
    }
  }

  render() {
    this.renderCustomCardTheme();

    if (!this.entity) {
      return html`
        <ha-card>
          <div class="preview not-available">
            <div class="metadata">
              <div class="not-available">
                ${localize('common.not_available')}
              </div>
            <div>
          </div>
        </ha-card>
      `;
    }

    if (this.compactView) {
      return this.renderCompact();
    } else {
      return this.renderFull();
    }
  }
}

customElements.define('charger-card', ChargerCard);
console.info(
  `%cCHARGER-CARD ${cconst.VERSION} IS INSTALLED`,
  'color: green; font-weight: bold',
  ''
);

window.customCards = window.customCards || [];
window.customCards.push({
  preview: true,
  type: 'charger-card',
  name: localize('common.name'),
  description: localize('common.description'),
});
