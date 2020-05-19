var pluginFactory = function( thisV2Client ) {

  return {

    v2Client: thisV2Client,

    //set on init
    context: null,

    defaultState: 'loading_screen',

    resources: 
    {
        APP_LOCATION_TICKET: "ticket_sidebar",
        APP_LOCATION_USER: "user_sidebar",

        FIELD_TYPE_TEXT: "text",
        FIELD_TYPE_IMAGE: "image",
        FIELD_TYPE_CHECKBOX: "checkbox",

        USER_FIELD_NAME_CUSTOMER_TYPE: "mailshot_customer_type",
        USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET: null,
        USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE: "mailshot_exclude_from_mailshot",
        USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT: "mailshot_use_default_values",
        USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION: "mailshot_use_organisation_values",

        TEMPLATE_NAME_MAIN: "./templates/main.hdbs",
        TEMPLATE_NAME_MAIN_MODAL_MODE: "./templates/sync-modal.hdbs",
        TEMPLATE_NAME_LOADING: "./templates/loading_screen.hdbs",
        TEMPLATE_NAME_SHOWERROR: "./templates/show_error.hdbs"
    },

    events: 
    {
        //init events
        //'app.activated'                  : 'init',
        'ticket.requester.id.changed'   : 'resetAppIfPageFullyLoaded',
        'user.email.changed'            : 'resetAppIfPageFullyLoaded',
        'user.id.changed'               : 'resetAppIfPageFullyLoaded',
        'user.name.changed'             : 'resetAppIfPageFullyLoaded',
        'user.organizations.changed'    : 'resetAppIfPageFullyLoaded',



        // Zendesk API Requests
        //'getZendeskUser.done'		: 'getZendeskUser_Done',
        //'getZendeskUser.fail'		: 'switchToErrorMessage',
        //'updateZendeskUser.done'        : 'updateZendeskUser_Done',
        //'updateZendeskUser.fail'        : 'switchToErrorMessage',
        //'getZendeskOrganizations.done'  : 'getZendeskOrganizations_Done',
        //'getZendeskOrganizations.fail'  : 'switchToErrorMessage',

        'getMailChimpAllListMembers.done'	: 'retrievedMailchimpAllListSubscribers',
        'getMailChimpAllListMembers.fail'	: 'switchToErrorMessage',	

        //mailchimp v3 api requests
        //'getMailChimpListMember.done'			: 'retrievedMailchimpSubscriber',
        //'getMailChimpListMember.fail'			: 'get_or_createOrUpadateMailChimpListMember_OnFail',
        'createOrUpadateMailChimpListMember.done'	: 'createOrUpadateMailChimpListMember_Done',
        'createOrUpadateMailChimpListMember.fail'	: 'get_or_createOrUpadateMailChimpListMember_OnFail',   

        //buttons on main form
        ///'click .exclude'                : 'excludeButtonOnClick',
        //'click .organization'           : 'organizationButtonOnClick',
        //'click .standard'               : 'standardButtonOnClick',

        //buttons on modal form
        'click .sync'                   : 'syncButtonFromModalOnClick',

        //buttons on error form
        //'click .error_go_back'              : 'resetAppIfPageFullyLoaded',
        //'click .error_override_mailchimp'   : 'createOrUpadateMailChimpListMember_Override_OnClick',
        //'click .error_create_new_mailchimp' : 'createOrUpadateMailChimpListMember_Add_New_OnClick',

        //mailchimp only fields when in sync
        'click .mc_only_field' : 'mailchimpOnlyField_OnClick', 

        //modal sync screen events  //show shown hide hidden
        //'hidden #sync_modal'	: 'afterHidden',

        //main screen events
        'user.mailshot_customer_type.changed' : 'userScreenCustomerTypeFieldChanged',

        '*.changed': 'formFieldChanged',

        //debug button
        //'click #debugtest': 'debugButtonOnClick'
    },

    requests: 
    {
        parentPlugin: null,  //set back to plugin (as in plugin.requests) during init();

        getZendeskUser: function( id )
        {
            let userApiCallSettings = 
            {       
                    url: 'https://upnrunning.zendesk.com/api/v2/users/'+encodeURIComponent(id)+'.json',
                    type:'GET',
                    dataType: 'json'
            };
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "requests.getZendeskUser(%d), userApiCallSettings = %o", id, userApiCallSettings );}
            /* DebugOnlyCode - END */ 
            return userApiCallSettings;
        },

        updateZendeskUser: function( userToSyncObject )
        {
            let userApiCallSettings = 
            {
                url: '/api/v2/users/create_or_update.json',
                type:'POST',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify(
                {
                    'user': 
                    { 
                        'id': userToSyncObject.id, 
                        'email': userToSyncObject.email,
                        'user_fields':
                        {
                            'mailshot_customer_type': userToSyncObject.customer_type
                        }
                    }
                })
            };
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "requests.updateZendeskUser(%o), userApiCallSettings = %o", userToSyncObject, userApiCallSettings );}
            /* DebugOnlyCode - END */ 
            return userApiCallSettings;
        },

        getZendeskOrganizations: function(userId, organizationId)
        {
            let userApiCallSettings = 
            {
                url:    typeof( organizationId ) !== "undefined" && organizationId !== null ? 
                        '/api/v2/organizations/'+encodeURIComponent(organizationId)+'.json' : 
                        '/api/v2/users/'+encodeURIComponent(userId)+'.organizations.json', 
                type:'GET',
                dataType: 'json'
            };
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "requests.getZendeskOrganizations(%d, %d), userApiCallSettings = %o", userId, organizationId, userApiCallSettings );}
            /* DebugOnlyCode - END */ 
            return userApiCallSettings;
        },

            getMailChimpAllListMembers: function()
            {
                    let jsonCall =
                    {
                            url: helpers.fmt( "https://%@.api.mailchimp.com/2.0/lists/members.json", this.mailchimp_datacentre_prefix ),
                            type: 'POST',
                            dataType: 'json',
                            contentType: 'application/json; charset=UTF-8',
                            data: JSON.stringify(
                            {
                                    "apikey": this.mailchimp_api_key,
                                    "id": this.mailchimp_list_id,
                                    "status": "subscribed",
                                    "opts": 
                                    {
                                            "start": 0,
                                            "limit": 100,
                                            "sort_field": "email",
                                            "sort_dir": "ASC"
                                    }
                            })
                    };
                    //console.log( "getMailChimpAllListMembers: API CAll DETAILS:" );console.dir( jsonCall );
                    return jsonCall;
            },

        getMailChimpListMember: function( emailAddress )
        {
            if( typeof( emailAddress ) === "undefined" || emailAddress === null )
            {
                return console.error( "ERROR CONDITION: getMailChimpListMember called with null email address" );
            }

            //requires md5.js utils js to create md5 hash of email address
            let md5HashOfEmail = md5(emailAddress.toLowerCase());                

            let jsonCall =
            {
                url: 'https://'+encodeURIComponent(this.parentPlugin.mailchimp_datacentre_prefix)+
                     '.api.mailchimp.com/3.0/lists/'+encodeURIComponent(this.parentPlugin.mailchimp_list_id)+
                     '/members/'+encodeURIComponent(md5HashOfEmail),
                type: 'GET',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                headers: 
                {
                    "Authorization": "Basic " + btoa( "api:" + this.parentPlugin.mailchimp_api_key )
                }
            };

            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "requests.getMailChimpListMember('%s'), jsonCall = %o", emailAddress, jsonCall ); }
            /* DebugOnlyCode - END */ 
            return jsonCall;
        },

        createOrUpadateMailChimpListMember: function( mailchimpSyncUser, updateNotCreate )
        {
            if( mailchimpSyncUser === null || mailchimpSyncUser.email_address == null )
            {
                    return console.warn( "ERROR CONDITION: createOrUpadateMailChimpListMember called with either null user or user with no email address" );
            }

            //require md5 library utils js to create md5 hash of email address
            let md5HashOfEmail =md5(mailchimpSyncUser.email_address.toLowerCase());

            let dataJSON = 				
            {
                "id": md5HashOfEmail,
                "email_address": mailchimpSyncUser.email_address,
                "email_type": "html",
                "status": mailchimpSyncUser.status,
                "status_if_new": "subscribed",
                "merge_fields":
                {  //these will be populated below
                },
                "vip": ( mailchimpSyncUser.customer_type === this.parentPlugin.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION )
            };

            //3 x mandatory merge fields plus extra ones from user object
            dataJSON.merge_fields[ this.parentPlugin.mailchimp_merge_field_forename ] = mailchimpSyncUser.forename;
            dataJSON.merge_fields[ this.parentPlugin.mailchimp_merge_field_surname ] = mailchimpSyncUser.surname;
            dataJSON.merge_fields[ this.parentPlugin.mailchimp_list_field_customer_type_name ] = mailchimpSyncUser.customer_type;
            for (let i=0; i < mailchimpSyncUser.extra_merge_fields.length; i++) 
            {
                dataJSON.merge_fields[ mailchimpSyncUser.extra_merge_fields[ i ].field_def.mailchimp_field ] = mailchimpSyncUser.extra_merge_fields[ i ].value;
            }

            let jsonCall =
            {
                url: 'https://'+encodeURIComponent(this.parentPlugin.mailchimp_datacentre_prefix)+
                     '.api.mailchimp.com/3.0/lists/'+encodeURIComponent(this.parentPlugin.mailchimp_list_id)+
                     '/members/'+encodeURIComponent(updateNotCreate ? md5HashOfEmail : ""),
                type: updateNotCreate ? 'PUT' : 'POST',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                headers: 
                {
                    "Authorization": "Basic " + btoa( "api:" + this.parentPlugin.mailchimp_api_key )
                },
                data: JSON.stringify( dataJSON )
            };

            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "requests.createOrUpadateMailChimpListMember( mailchimpSyncUser:'%o', updateNotCreate: '%o' ), dataJSON = %o, jsonCall = %o", mailchimpSyncUser, updateNotCreate, dataJSON, jsonCall ); }
            /* DebugOnlyCode - END */ 
            return jsonCall;
        },

            deleteMailChimpListMember: function( mailchimpSyncUser )
            {

                    if( mailchimpSyncUser === null || mailchimpSyncUser.email_address === null )
                    {
                            return console.warn( "ERROR CONDITION: deleteMailChimpListMember called with either null user or user with no email address" );
                    }

                    //requires md5.js utils js to create md5 hash of email address
                    let md5HashOfEmail = md5(mailchimpSyncUser.email_address.toLowerCase());

                    let jsonCall =
                    {
                            url: helpers.fmt( "https://%@.api.mailchimp.com/3.0/lists/%@/members/%@", this.mailchimp_datacentre_prefix, this.mailchimp_list_id, md5HashOfEmail ),
                            type: 'DELETE',
                            dataType: 'json',
                            contentType: 'application/json; charset=UTF-8',
                            headers: 
                            {
                                            "Authorization": "Basic " + btoa( "api:" + this.mailchimp_api_key )
                            }
                    };
                    //console.log( "deleteMailChimpListMember: API CAll DETAILS:" );console.dir( jsonCall );
                    return jsonCall;
            }
    },		

    syncButtonFromModalOnClick: function() 
    {
        this.syncExistingUserToMailchimp( this.zendesk_user, true );
        return false;
    },

    // --- INITIALISATION FUCNTIONS
    init: function( modalMode, existingContext ) 
    {
            console.log( "Starting app init()");

            //housekeeping (functions in this.requests cannot access parent plugin when they in turn reference 'this' so we have a pointer back - it's just a javascript function context thing)
            this.requests.parentPlugin = this;
            this.modalMode = ( typeof modalMode === 'undefined' || modalMode === null ) ? false : modalMode;

            //get CommonJS Modules
            this.zendeskObjectsModule = {ZendeskOrganization, ZendeskUser};
            this.parseNamesModule = NameParse;

            //delcare other instance variables
            this.mailshot_sync_user = null;
            this.zendesk_user = null;

            //flag to keep track of when app is fully loaded
            this.context = ( typeof existingContext === 'undefined' ) ? null : existingContext;
            this.settings_fetched = false;
            this.zendesk_user = null;
            this.isFullyInitialized = false;  //this will only be set to true in resetAppIfPageFullyLoaded once the above ones are set ()

            //get location (which screen we're on) unless a value was passed into init() from outside
            if( this.context === null ) 
            {
                this.v2Client.context().then( (context) => {
                    console.log(context);
                    this.context = context;
                    //hide hidden customer type field if in user screen
                    this.hideFieldsIfInUserLocation();
                    this.resetAppIfPageFullyLoaded();
                }, ( error ) => { this.switchToErrorMessage(error, "Could not get app context, please check your internet connection and try again");} );
            }
            
            //Get Settings from manifest.json
            this.v2Client.metadata().then( (metadata) => {
                console.log(metadata.settings);
                this.mailchimp_api_key = metadata.settings.mailchimp_api_key;
                this.mailchimp_datacentre_prefix = metadata.settings.mailchimp_datacentre_prefix;
                this.mailchimp_list_id = metadata.settings.mailchimp_list_id;
                this.mailchimp_merge_field_forename = metadata.settings.mailchimp_merge_field_forename;
                this.mailchimp_merge_field_surname = metadata.settings.mailchimp_merge_field_surname;
                this.mailchimp_list_field_customer_type_name = metadata.settings.mailchimp_merge_field_customer_type;
                this.mailchimp_list_field_customer_type_default_value = metadata.settings.mailchimp_merge_field_customer_type_default_val;
                this.mailchimp_organisation_button_label = metadata.settings.mailchimp_organisation_button_label;
                this.mailchimp_standard_button_label = metadata.settings.mailchimp_standard_button_label;

                //setup field mappings
                this.customer_type_field_mapping = { zendesk_field: 'mailshot_customer_display_name', mailchimp_field: this.mailchimp_list_field_customer_type_name, type: this.resources.FIELD_TYPE_TEXT, default_value: this.mailchimp_list_field_customer_type_default_value };
                this.organization_field_mappings = JSON.parse( metadata.settings.mailchimp_organization_field_mappings );
                this.user_field_mappings = JSON.parse( metadata.settings.mailchimp_user_field_mappings );
                this.mailshot_only_field_mappings = JSON.parse( metadata.settings.mailchimp_mailshot_only_field_mappings );

                this.settings_fetched = true;
                this.resetAppIfPageFullyLoaded();
            }, ( error ) => { this.switchToErrorMessage(error, "Could not get your app settings, please check your internet connection and try again");} );
    },

    resetAppIfPageFullyLoaded: function() 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "resetAppIfPageFullyLoaded called" );
            console.log( "this.isFullyInitialized = " + this.isFullyInitialized + " and this.resources.APP_LOCATION_TICKET = " + this.resources.APP_LOCATION_TICKET + " and this.context.location = %s", ( this.context === null ? '[this.context = null]' : this.context.location ) );
        }
        /* DebugOnlyCode - END */

        //has the context (ie which page are we on) loaded from init() function
        if( !this.isFullyInitialized && this.context === null )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "CHECK FAILED: this.context === null" ); console.groupEnd(); }
            /* DebugOnlyCode - END */
            return;
        }   
        //have the settings (ie on the app settings config screen) loaded from init() function
        if( !this.isFullyInitialized && !this.settings_fetched )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "CHECK FAILED: this.settings_fetched = false" ); console.groupEnd(); }
            /* DebugOnlyCode - END */
            return;
        } 

        //dont continue if page not fuly loaded yet
        if( !this.isFullyInitialized && this.context.location === this.resources.APP_LOCATION_TICKET && this.zendesk_user === null )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "CHECK FAILED: this.zendesk_user === null, running this.v2Client.get('ticket.requester')" ); console.groupEnd();}
            /* DebugOnlyCode - END */
            this.v2Client.get('ticket.requester').then( (ticketRequester) => {
                this.zendesk_user = ticketRequester['ticket.requester'];
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "SET this.zendesk_user = ticketRequester['ticket.requester'] EVEN THOUGH TICKETREQUESTER IS NOT A PROPER ZENDEDK USER OBJECT, ITS A ZENDESK API RETURN OBJECT BUT IT DOES STORE THE USERS ID AND WE'LL USE THIS VERY VERY SOON TO LOAD THE PROPER ZENDESKUSER OBJECT AND REPLACE IT WITH THAT SO NO HARM DONE: this.zendesk_user = %o", this.zendesk_user ); }
                /* DebugOnlyCode - END */
                this.resetAppIfPageFullyLoaded();
            }, ( error ) => { this.switchToErrorMessage(error, "Could not get the ticket info, please check your internet connection and try again");} );
            return;
        }
        if( !this.isFullyInitialized &&this.context.location === this.resources.APP_LOCATION_USER && ( this.user().id() === null || this.user().email() === null || this.user().name() === null ) )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "CHECK FAILED: this.user().id() = " + this.user().id() + " and this.user().email() = " + this.user().email() + " and this.user().name() = " + this.user().name() ); console.groupEnd();}
            /* DebugOnlyCode - END */
            return;
        }

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "CHECK PASSED this.context = %o, this.settings_fetched = %o, this.context.location = %s, this.zendesk_user = %o", this.context, this.settings_fetched, this.context.location, this.zendesk_user ); console.groupEnd();}
        /* DebugOnlyCode - END */

        this.mailshot_sync_user = null;


        if(this.context.location === this.resources.APP_LOCATION_TICKET )
        {
            this.switchToLoadingScreen( "Loading Ticket Requester..." );
            this.makeAjaxCall( 
                this.requests.getZendeskUser( this.zendesk_user.id ), 
                this.getZendeskUser_Done,  
                this.switchToErrorMessage 
            );
        }
        else if(this.context.location === this.resources.APP_LOCATION_USER )
        {
            //CHECK HERE IF USER WAS UPDATED ELSEWHERE!
            this.switchToLoadingScreen( "Loading Zendesk User..." );
            this.getUserFromFrameworkInUserSidebarLocation();
        }
        this.isFullyInitialized = true;

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "this.isFullyInitialized = %o", this.isFullyInitialized );
            console.log( "********** APP INITIALISED ******* this = %o", this );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    makeAjaxCall: function (ajaxSettings, successFunction, failFunction, useZendeskCORSProxy) 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.groupCollapsed( "makeAjaxCall (ajaxSettings, %s, %s) called", successFunction.name, failFunction.name );
            console.log( "ARG1: ajaxSettings = %o", ajaxSettings );
            console.log( "ARG2: successFunction = %o", successFunction );
            console.log( "ARG3: failFunction = %o", failFunction );
            console.log( "ARG4: useZendeskCORSProxy = %o", useZendeskCORSProxy );
        }
        /* DebugOnlyCode - END */

        if( typeof useZendeskCORSProxy !== 'undefined' && useZendeskCORSProxy )
        {
            ajaxSettings.cors = false;
        }

        this.v2Client.request(ajaxSettings).then(
            (data) => {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "AJAX SUCCESS: calling success function '%s(data)', data = %o", successFunction.name, data ); }
                /* DebugOnlyCode - END */
                successFunction.call( this, data );
            },
            (response) => {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "AJAX FAIL: calling failure function '%s(response)', response = %o", failFunction.name, response ); }
                /* DebugOnlyCode - END */
                failFunction.call( this, response);
            }
        );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    //MAIN SCREEN UTILITY FUNCTIONS
    hideFieldsIfInUserLocation: function() 
    {
            if( this.context.location === this.resources.APP_LOCATION_USER )
            {
                    _.each([this.resources.USER_FIELD_NAME_CUSTOMER_TYPE], function(f) 
                    {
                    var field = this.userFields(f);

                            if (field && field.isVisible()) 
                            {
                              field.hide();
                            }
                    }, this);
            }	
    },

    //---EXTERNAL FIELD SCREEN CHANGE EVENTS
    formFieldChanged: function( event )
    {
            let matchedZDFieldName = null;
            if(this.context.location === this.resources.APP_LOCATION_USER )
            {
                    let fieldName = event.propertyName;
                    for( let i=0; i < this.user_field_mappings.length; i++)
                    {
                            if( fieldName === "user."+this.user_field_mappings[i].zendesk_field )
                            {
                                    matchedZDFieldName = this.user_field_mappings[i].zendesk_field;
                                    break;
                            }
                    }
            }

            //if it's a dependant 'extra' field
            if( matchedZDFieldName!==null && typeof( this.zendesk_user ) !== "undefined" && this.zendesk_user !== null )
            {
                    this.zendesk_user.findExtraFieldByName( matchedZDFieldName, true ).value = event.newValue;
                    this.switchToMainTemplate();
            }
    },	

    userScreenCustomerTypeFieldChanged: function(evt)
    {
            //fetch new value from field and old value from user
            let oldCustomerType = this.zendesk_user.customer_type;
            let newCustomerTypeSelected = this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE );
            this.changeCustomerType( oldCustomerType, newCustomerTypeSelected );
    },

    //---APP FIELD ONCLICK EVENT
    mailchimpOnlyField_OnClick: function( event ) 
    {
            let tempField = null;
            console.warn( "NEED TO CLONE MAILCHIMP USER IDEALLY AT THIS POINT");
            for( let i=0; i < this.mailshot_sync_user.extra_merge_fields.length; i++)
            {
                    tempField = this.mailshot_sync_user.extra_merge_fields[ i ];
                    if( typeof( tempField.field_def.zendesk_field ) === "undefined" && ( "MC_ONLY_" + tempField.field_def.mailchimp_field ) === event.target.id )
                    {
                            if( tempField.field_def.type === this.resources.FIELD_TYPE_CHECKBOX )
                            {
                                    tempField.value = ( tempField.value === "0" || tempField.value === 0 || tempField.value === false ) ? "1" : "0";
                            }
                            else
                            {
                                    console.error( "Unsupported field type: " + tempField.type );
                            }
                    }
            }

            //now save the updated user in mailchimp
            this.switchToLoadingScreen( "Updating Mailchimp Member" );
            this.ajax( "createOrUpadateMailChimpListMember", this.mailshot_sync_user, true );
    },	

    //EXCLUDE/ORGANISATION/STANDARD FIELD ONCLICK FUNCTIONS
    excludeButtonOnClick: function()
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "excludeButtonOnClick() called" );
            console.log( "Checking if we're in user screen: answer = %o)", ( this.context.location === this.resources.APP_LOCATION_USER ) );
        }
        /* DebugOnlyCode - END */ 

        if( this.context.location === this.resources.APP_LOCATION_USER )
        {
            this.switchToLoadingScreen( "Updating Zendesk User" );
            this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE, this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE );
            //this triggers userScreenCustomerTypeFieldChanged
        }
        else 
        {
            //update via zendesk apis
            let updatedUserToSave = this.zendesk_user.clone();
            updatedUserToSave.customer_type = this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE;
            this.switchToLoadingScreen( "Updating Zendesk User..." );
            this.makeAjaxCall( 
                this.requests.updateZendeskUser( updatedUserToSave ), 
                this.updateZendeskUser_Done,  
                this.switchToErrorMessage 
            );
        }

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning false" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return false;
    },

    organizationButtonOnClick: function()
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "organizationButtonOnClick() called" );
            console.log( "Checking if we're in user screen: answer = %o)", ( this.context.location === this.resources.APP_LOCATION_USER ) );
        }
        /* DebugOnlyCode - END */ 

        if(this.context.location === this.resources.APP_LOCATION_USER )
        {
            this.switchToLoadingScreen( "Updating Zendesk User" );
            this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE, this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION );
            //this triggers userScreenCustomerTypeFieldChanged
        }
        else 
        {
            //update via apis
            let updatedUserToSave = this.zendesk_user.clone();
            updatedUserToSave.customer_type = this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION;
            this.switchToLoadingScreen( "Updating Zendesk User..." );
            this.makeAjaxCall( 
                this.requests.updateZendeskUser( updatedUserToSave ), 
                this.updateZendeskUser_Done,  
                this.switchToErrorMessage 
            );
        }

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning false" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return false;
    },

    standardButtonOnClick: function()
    {
            if(this.context.location === this.resources.APP_LOCATION_USER )
            {
                    this.switchToLoadingScreen( "Updating Zendesk User" );
                    this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE, this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT );
                    //this triggers userScreenCustomerTypeFieldChanged to be changed so no need to make any further calls
            }
            else 
            {
                    let updatedUserToSave = this.zendesk_user.clone();
                    updatedUserToSave.customer_type = this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT;
                    this.switchToLoadingScreen( "Updating Zendesk User" );
                    this.ajax( 'updateZendeskUser', updatedUserToSave );
            }
            return false;
    },	

    //ZENDESK USER AND ORGANIZATION DATA API WRAPPER FUNCTIONS
    getZendeskUser_Done: function( userObjectFromDataAPI )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "getZendeskUser_Done (ajaxSettings) called" );
            console.log( "ARG1: userObjectFromDataAPI = %o", userObjectFromDataAPI );
        }
        /* DebugOnlyCode - END */

        this.zendesk_user = this.createZendeskUserFromAPIReturnData( userObjectFromDataAPI );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Converted userObjectFromDataAPI to user object: this.zendesk_user = %o", this.zendesk_user );
            console.log( "Checking if we have to load organisation (answer: %o), this.zendesk_user.isOrganization() = %o, this.zendesk_user.belongsToOrganization() = %o", this.zendesk_user.isOrganization() && this.zendesk_user.belongsToOrganization(), this.zendesk_user.isOrganization(),  this.zendesk_user.belongsToOrganization() ); 
        }
        /* DebugOnlyCode - END */

        //now populate the users organization object through another API call but only if we need it (user type = organization )
        if( this.zendesk_user.isOrganization() && this.zendesk_user.belongsToOrganization() )
        {
            this.switchToLoadingScreen( "Loading Organization..." );
            this.makeAjaxCall( 
                this.requests.getZendeskOrganizations( this.zendesk_user.id, this.zendesk_user.organization_id ), 
                this.getZendeskOrganizations_Done,  
                this.switchToErrorMessage 
            );
        }
        //otherwise we've finished getting the user object
        else
        {
            this.fetchMailchimpObjectIfNecessary();
        }

        this.zendesk_user = this.createZendeskUserFromAPIReturnData( userObjectFromDataAPI );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, this.zendesk_user = %o", this.zendesk_user );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    createZendeskUserFromAPIReturnData: function( userObjectFromDataAPI )
    {
        if( debug_mode ) 
        { 
            console.group( "createZendeskUserFromAPIReturnData (userObjectFromDataAPI) called" );
            console.log( "ARG1: userObjectFromDataAPI = %o", userObjectFromDataAPI );
        }

        var zendeskUserObjectToReturn = null;
        if( userObjectFromDataAPI !== null )
        {
            zendeskUserObjectToReturn = new this.zendeskObjectsModule.ZendeskUser(
                this, 
                userObjectFromDataAPI.user.id,
                userObjectFromDataAPI.user.name,
                userObjectFromDataAPI.user.email,
                userObjectFromDataAPI.user.user_fields.mailshot_customer_type,
                ( typeof( userObjectFromDataAPI.user.organization_id ) !== 'undefined' && userObjectFromDataAPI.user.organization_id !== null ) ? userObjectFromDataAPI.user.organization_id : null //being careful as sometimes users can be set to link through to more than one org depending on admin settings
            );
            if( debug_mode ) { console.log( "Completed part 1 of 2, basic user: zendeskUserObjectToReturn = %o", zendeskUserObjectToReturn); }

            //now set the optional extra user fields from returned API data
            zendeskUserObjectToReturn.populateExtraFieldsFromUserAPIData( userObjectFromDataAPI.user );
            if( debug_mode ) { console.log( "Completed part 2 of 2, populateExtraFieldsFromUserAPIData: zendeskUserObjectToReturn = %o", zendeskUserObjectToReturn); }
            //we've kept a record of the org id if there is one but now leave org object as null as this info is not available on this API return data
        }
        else console.warn( "createZendeskUserFromAPIReturnData called but userObjectFromDataAPI = null - this should never happen!");

        if( debug_mode ) 
        { 
            console.log( "Finished, zendeskUserObjectToReturn = %o", this.zendesk_user );
            console.groupEnd();
        }
        
        return zendeskUserObjectToReturn;
    },

    getUserFromFrameworkInUserSidebarLocation: function()
    {
            //console.log( 'Starting getUserFromFrameworkInUserSidebarLocation' );

            //fetch first organization object if there is one, null if not
            let usersOrgObject = ( typeof( this.user().organizations()[0] ) !== 'undefined' && this.user().organizations()[0] !== null ) ? this.user().organizations()[0] : null;

            //initialize user object
            this.zendesk_user = new this.zendeskObjectsModule.ZendeskUser(
                    this,
                    this.user().id(),
                    this.user().name(),
                    this.user().email(),
                    this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE ),
                    ( usersOrgObject === null ) ? null : usersOrgObject.id()
            );

            //now set the optional extra user fields from the framework object
            this.zendesk_user.populateExtraFieldsFromFrameworkUserObject( this.user() );

            //popupate org object if one is set on user record
            if( usersOrgObject !== null )
            {
                    this.zendesk_user.orgObject = new this.zendeskObjectsModule.ZendeskOrganization( this, usersOrgObject.id(), usersOrgObject.name(), usersOrgObject.customField( this.customer_type_field_mapping.zendesk_field ) );
                    this.zendesk_user.orgObject.populateExtraFieldsFromFrameworkOrgObject( usersOrgObject );
            }

            //console.log( "Finished getUserFromFrameworkInUserSidebarLocation, this.zendesk_user = " );console.dir( this.zendesk_user );
            this.fetchMailchimpObjectIfNecessary();
    },

    updateZendeskUser_Done: function( userObjectFromDataAPI )
    {
            let returnedUser = this.createZendeskUserFromAPIReturnData( userObjectFromDataAPI );
            returnedUser.orgObject = this.zendesk_user.orgObject;  //user object was updated but the org object wasn't so copy the proper org object from org API call on init for this basic one created by the above method
            let oldCustomerType = this.zendesk_user.customer_type;
            this.zendesk_user = returnedUser;

            //now populate the users arganization object through another API call but only if we need it (user type = organization )
            if( this.zendesk_user.isOrganization() && this.zendesk_user.belongsToOrganization() && !this.zendesk_user.orgObjectIsPopulated())
            {
                    //cant call changeCustomerType as yet because we still need to load organization object so register the change necessary on user object temporarily
                    this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType= ( oldCustomerType === null ) ? 'NOTSET' : oldCustomerType;
                    this.switchToLoadingScreen( "Loading Organization" );
                    this.ajax( 'getZendeskOrganizations', this.zendesk_user.id, this.zendesk_user.organization_id );
            }
            else
            {
                    //nothing left to do - so register the new customer type in order to delete mailchimp member if necessary
                    this.changeCustomerType( oldCustomerType, this.zendesk_user.customer_type );
            }	 
    },

    getZendeskOrganizations_Done: function( organizationObjectFromDataAPI )
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "getZendeskOrganizations_Done (organizationObjectFromDataAPI) called" );
            console.log( "ARG1: organizationObjectFromDataAPI = %o", organizationObjectFromDataAPI );
        }
        /* DebugOnlyCode - END */

        this.zendesk_user.orgObject = this.createZendeskOrganizationFromAPIReturnData( organizationObjectFromDataAPI );

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Checking was this load as a result of agent pressing the 'organization' button?  \nthis.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType = %o", this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType ); }
        /* DebugOnlyCode - END */

        //was this load as a result of pressing the "organization" button?
        if( typeof( this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType ) !== "undefined" && this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType !== null )
        {
            let oldType = ( this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType === 'NOTSET' ) ? null : this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType;
            this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType = null;
            this.changeCustomerType( oldType, this.zendesk_user.customer_type );
        }
        else
        {
            //we now have full populated user object to save complete with org object and no more changes so continue to load form
            this.fetchMailchimpObjectIfNecessary();
        }

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, this.zendesk_user = %o", this.zendesk_user );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    createZendeskOrganizationFromAPIReturnData: function( organizationObjectFromDataAPI )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "createZendeskOrganizationFromAPIReturnData(organizationObjectFromDataAPI) called" );
            console.log( "ARG1: organizationObjectFromDataAPI = %o", organizationObjectFromDataAPI );
            console.log( "Checking if We need to populate organisation, next comment will be check passed if we actually do");
        }
        /* DebugOnlyCode - END */
        
        let organizationObjectToReturn = null;
        if( typeof( organizationObjectFromDataAPI ) !== "undefined" && organizationObjectFromDataAPI !== null && typeof( organizationObjectFromDataAPI.organization ) !== "undefined" && organizationObjectFromDataAPI.organization !== null )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "Check Passed, building base object and adding extra fields.    this.customer_type_field_mapping.zendesk_field = %s", this.customer_type_field_mapping.zendesk_field ); }
            /* DebugOnlyCode - END */
            console.log( "Checking if We need to populate organisation, next comment will be check passed if we actually do");
            organizationObjectToReturn = new this.zendeskObjectsModule.ZendeskOrganization(
                    this,
                    organizationObjectFromDataAPI.organization.id,
                    organizationObjectFromDataAPI.organization.name,
                    organizationObjectFromDataAPI.organization.organization_fields[ this.customer_type_field_mapping.zendesk_field ]
            );
            organizationObjectToReturn.populateExtraFieldsFromOrganizationAPIData( organizationObjectFromDataAPI.organization );
        }
        else console.warn( "createZendeskOrganizationFromAPIReturnData called but organizationObjectFromDataAPI = null or doesnt contain a organization property - this should never happen!");



        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, organizationObjectToReturn = %o", organizationObjectToReturn );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return organizationObjectToReturn;
    },

    fetchMailchimpObjectIfNecessary: function()
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "fetchMailchimpObjectIfNecessary() called" );
            console.log( "If included, Check if mailshot_sync_user already loaded? \nthis.zendesk_user.isIncluded() = %o \nthis.mailshot_sync_user = %o",  this.zendesk_user.isIncluded(), this.mailshot_sync_user );
        }
        /* DebugOnlyCode - END */

        //if it's included in the mailchimp sync and we dont already have the mailchimp user then get it
        if( this.zendesk_user.isIncluded() && this.mailshot_sync_user === null )
        {
            this.switchToLoadingScreen( "Loading user from Mailchimp..." );
            this.makeAjaxCall( 
                this.requests.getMailChimpListMember( this.zendesk_user.email, this ), 
                this.retrievedMailchimpSubscriber,  
                this.get_or_createOrUpadateMailChimpListMember_OnFail 
            );
        }
        else
        {
            this.switchToMainTemplate();
        }

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished");
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    changeCustomerType: function( oldType, newType ) 
    {
            //console.log( "changeCustomerType called, oldType: " + oldType + "newType: " + newType );

            //update user object so it doesnt get out of sync
            this.zendesk_user.customer_type = newType;

            //if NOT SET or EXCLUDE were selected 
            if( newType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET || newType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE  )
            {
                    //if NOT SET or EXCLUDE were selected AND it was previously set to STANDARD or ORGANIZATION
                    if( oldType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT || oldType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION )
                    {
                            this.deleteExistingUserFromMailchimp( this.mailshot_sync_user );
                    }
                    //if NOT SET or EXCLUDE were selected AND it was previously set to the other one
                    if( oldType !== newType )
                    {
                            //reload the app template with new updated user object - no need to call mailchimp API
                            this.switchToMainTemplate();
                    }
                    else
                    {
                            //value hasnt actually changed so just go back to form
                            this.switchToMainTemplate();
                    }
            }

            //if ORGANIZATION or STANDARD was selected
            if( newType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION || newType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT  )
            {
                    //if ORGANIZATION or STANDARD  were selected AND it was previously set to EXCLUDE or NOT SET
                    if( oldType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE || oldType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET )
                    {
                            this.syncNewUserToMailchimp( this.zendesk_user );
                    }
                    //if ORGANIZATION or STANDARD were selected AND it was previously set to the other one
                    else if( oldType !== newType )
                    {
                            this.syncExistingUserToMailchimp( this.zendesk_user, true );
                    }
                    else
                    {
                            //value hasnt actually changed so just go back to form
                            this.switchToMainTemplate();
                    }
            }
    },


    //MAILCHIMP SYNCING WRAPPER FUNCTIONS
    retrievedMailchimpSubscriber: function( returnedMailchimpUser ) 
    {
            //console.log( "started retrievedMailchimpSubscriber, returnedMailchimpUser = returnedMailchimpUser" );console.dir( returnedMailchimpUser ); ////console.log( "" );

            this.mailshot_sync_user = 
            {
                    email_address: returnedMailchimpUser.email_address,
                    status: "subscribed",
                    forename: returnedMailchimpUser.merge_fields[ this.mailchimp_merge_field_forename ],
                    surname: returnedMailchimpUser.merge_fields[ this.mailchimp_merge_field_surname  ],
                    customer_type: returnedMailchimpUser.merge_fields[ this.customer_type_field_mapping.mailchimp_field ],
                    extra_merge_fields: []
            };

            let arrayIndex = 0;
            for (let i=0; i < this.user_field_mappings.length; i++) 
            {
                    this.mailshot_sync_user.extra_merge_fields[ arrayIndex ] = { field_def: this.user_field_mappings[ i ], value: returnedMailchimpUser.merge_fields[ this.user_field_mappings[ i ].mailchimp_field ]};
                    arrayIndex++;
            }
            for(i=0; i < this.organization_field_mappings.length; i++) 
            {
                    this.mailshot_sync_user.extra_merge_fields[ arrayIndex ] = { field_def: this.organization_field_mappings[ i ], value: returnedMailchimpUser.merge_fields[ this.organization_field_mappings[ i ].mailchimp_field ] };
                    arrayIndex++;
            }
            for (i=0; i < this.mailshot_only_field_mappings.length; i++) 
            {
                    this.mailshot_sync_user.extra_merge_fields[ arrayIndex ] = { field_def: this.mailshot_only_field_mappings[ i ], value: returnedMailchimpUser.merge_fields[ this.mailshot_only_field_mappings[ i ].mailchimp_field ] };
                    arrayIndex++;
            }		

            //console.log( "Finished retrievedMailchimpSubscriber, this.mailshot_sync_user = " );console.dir( this.mailshot_sync_user );
            this.switchToMainTemplate();
    },	

    syncNewUserToMailchimp: function( zendeskUser ) 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "syncNewUserToMailchimp (zendeskUser) called" );
            console.log( "ARG1: zendeskUser = %o", zendeskUser );
        }
        /* DebugOnlyCode - END */

        let newMailChimpUserToSave = this.createNewMailchimpSyncUserObject( zendeskUser );

        this.switchToLoadingScreen( "Adding Mailchimp Member..." );
        this.makeAjaxCall( 
            this.requests.createOrUpadateMailChimpListMember( newMailChimpUserToSave, false ), 
            this.createOrUpadateMailChimpListMember_Done,  
            this.get_or_createOrUpadateMailChimpListMember_OnFail 
        );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    syncExistingUserToMailchimp: function( zendeskUser, tryToPreserveMCOnlyFields ) 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "syncExistingUserToMailchimp (zendeskUser, tryToPreserveMCOnlyFields) called" );
            console.log( "ARG1: zendeskUser = %o", zendeskUser );
            console.log( "ARG2 (optional): tryToPreserveMCOnlyFields = %o", tryToPreserveMCOnlyFields );
        }
        /* DebugOnlyCode - END */

        let newMailChimpUserToSave = this.createNewMailchimpSyncUserObject( zendeskUser );

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Checking if we need to copy across extra merge fields to mailchimp object too? (answer = %o)  \n tryToPreserveMCOnlyFields = %o, this.mailshot_sync_user = %o, zendeskUser.email = %o, this.mailshot_sync_user.email_address = %o", ( typeof( tryToPreserveMCOnlyFields ) !== "undefined" && tryToPreserveMCOnlyFields === true && this.mailshot_sync_user !== null && zendeskUser.email === this.mailshot_sync_user.email_address ), tryToPreserveMCOnlyFields, this.mailshot_sync_user, zendeskUser.email, this.mailshot_sync_user.email_address ); }
        /* DebugOnlyCode - END */
        //if switching between Standard and Org mode try to preserve the value of the Mailchimp only checkbox fields
        if( typeof( tryToPreserveMCOnlyFields ) !== "undefined" && tryToPreserveMCOnlyFields === true && this.mailshot_sync_user !== null && zendeskUser.email === this.mailshot_sync_user.email_address )
        {
            for( let i=0; i < this.mailshot_sync_user.extra_merge_fields.length; i++)
            {
                if( typeof( this.mailshot_sync_user.extra_merge_fields[ i ].field_def.zendesk_field ) === "undefined" ) 
                {
                        newMailChimpUserToSave.extra_merge_fields[ i ].value = this.mailshot_sync_user.extra_merge_fields[ i ].value;
                }
            }
        }

        this.switchToLoadingScreen( "Updating Mailchimp Member..." );
        this.makeAjaxCall( 
            this.requests.createOrUpadateMailChimpListMember( newMailChimpUserToSave, true ), 
            this.createOrUpadateMailChimpListMember_Done,  
            this.get_or_createOrUpadateMailChimpListMember_OnFail,
            true
        );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, newMailChimpUserToSave = %o", newMailChimpUserToSave );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    deleteExistingUserFromMailchimp: function( mailchimpUser ) 
    {
            this.switchToLoadingScreen( "Deleting Mailchimp Member" );
            this.ajax( "deleteMailChimpListMember", mailchimpUser );
    },

    get_or_createOrUpadateMailChimpListMember_OnFail: function( errorResponse ) 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "get_or_createOrUpadateMailChimpListMember_OnFail(errorResponse) called" );
            console.log( "ARG1: errorResponse = %o", errorResponse );
        }

        //check to see if we were in create only mode but the users email address was already found.
        let redirectedToBespokeErrorPage = false;
        try
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "PEEKING AT ERROR MESSAGE: running: let responseTextJSON = JSON.parse( errorResponse.responseText );"); }
            /* DebugOnlyCode - END */
            let responseTextJSON = JSON.parse( errorResponse.responseText );
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "now responseTextJSON = %o", responseTextJSON ); }
            /* DebugOnlyCode - END */
                
            if( errorResponse.status === 400 && responseTextJSON.title === "Member Exists" )
            {
                this.switchToErrorMessage( errorResponse, this.zendesk_user.email + " already exists in mailchimp.<br /><br/>Do you want to override his/her details?", "Override", "error_override_mailchimp", "createOrUpadateMailChimpListMember_Override_OnClick()" );
                redirectedToBespokeErrorPage = true;
            }
            if( errorResponse.status === 404 && responseTextJSON.title === "Resource Not Found" )
            {
                this.switchToErrorMessage( errorResponse, this.zendesk_user.email + " doesn't exist in mailchimp.<br /><br/>Do you want to create a new record for him/her?", "Create New", "error_create_new_mailchimp", "createOrUpadateMailChimpListMember_Add_New_OnClick()" );
                redirectedToBespokeErrorPage = true;
            }
        }
        catch(e)
        {
            console.warn( "Could not JSON Parse errorResponse.responseText from get_or_createOrUpadateMailChimpListMember. errorResponse = %o", errorResponse );
        }

        if( !redirectedToBespokeErrorPage )
        {
                this.switchToErrorMessage( errorResponse );
        }
    
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, redirectedToBespokeErrorPage = %o", redirectedToBespokeErrorPage );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    createOrUpadateMailChimpListMember_Override_OnClick: function() 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "createOrUpadateMailChimpListMember_Override_OnClick() called" );
        }
        /* DebugOnlyCode - END */

        this.syncExistingUserToMailchimp( this.zendesk_user );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning false;", this.zendesk_user );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return false;
    },

    createOrUpadateMailChimpListMember_Add_New_OnClick: function() 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "createOrUpadateMailChimpListMember_Add_New_OnClick() called" );
        }
        /* DebugOnlyCode - END */

        this.syncNewUserToMailchimp( this.zendesk_user );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning false;", this.zendesk_user );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return false;
    },

    createOrUpadateMailChimpListMember_Done: function( returnedMailchimpUser ) 
    {
            this.retrievedMailchimpSubscriber( returnedMailchimpUser );
    },

    createNewMailchimpSyncUserObject: function( zendeskSyncUserObject )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "createNewMailchimpSyncUserObject(zendeskSyncUserObject) called" );
            console.log( "ARG1: zendeskSyncUserObject = %o", zendeskSyncUserObject );
        }
        /* DebugOnlyCode - END */
            
        let useDefaultOrgValues = zendeskSyncUserObject.isDefault();		

        //Sanity checks
        if(zendeskSyncUserObject === null )
        {
                console.warn("createNewMailchimpSyncUserObject called with null zendeskSyncUserObject");
                return null;
        }
        if(!useDefaultOrgValues && zendeskSyncUserObject.orgObject === null )
        {
                console.warn("createNewMailchimpSyncUserObject called with customer type " + zendeskSyncUserObject.customer_type + " and  null zendeskSyncUserObject.orgObject");
                return null;
        }

        //base object without extra merge fields
        var mailchimpUserToReturn =
        {
            email_address: zendeskSyncUserObject.email,
            status: "subscribed",
            forename: zendeskSyncUserObject.getForeName(),
            surname: zendeskSyncUserObject.getSurname(),
            customer_type: zendeskSyncUserObject.getMailchimpCustomerType(),
            extra_merge_fields: []
        };
        
        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Copied base user object (without 'additional fields') over to mailchimpUserToReturn. mailchimpUserToReturn = %o", mailchimpUserToReturn ); }
        /* DebugOnlyCode - END */

        //extra merge fields for organisation fields
        let arrayIndex = 0;
        for (let i=0; i < zendeskSyncUserObject.extra_user_fields.length; i++) 
        {
                mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: zendeskSyncUserObject.extra_user_fields[ i ].field_def, value: ( zendeskSyncUserObject.extra_user_fields[ i ].value === null ) ? "" : zendeskSyncUserObject.extra_user_fields[ i ].value };
                arrayIndex++;
        }
        for (let i=0; i < this.organization_field_mappings.length; i++) 
        {
                mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: this.organization_field_mappings[ i ], value: useDefaultOrgValues ? this.organization_field_mappings[ i ].default_value : zendeskSyncUserObject.orgObject.extra_org_fields[ i ].value };
                arrayIndex++;
        }
        for (let i=0; i < this.mailshot_only_field_mappings.length; i++) 
        {
                mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: this.mailshot_only_field_mappings[ i ], value: this.mailshot_only_field_mappings[ i ].default_value };
                arrayIndex++;
        }

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Now added user fields, organisation fields and mailchimp only fields over to mailchimpUserToReturn.extra_merge_fields. mailchimpUserToReturn = %o", mailchimpUserToReturn );
            console.log( "Finished, returning mailchimpUserToReturn" );
            console.groupEnd();
        }
        
        /* DebugOnlyCode - END */
        return mailchimpUserToReturn;
    },

    //SWITCH TO HTML TEMPLATE FUNCTIONS
    switchToLoadingScreen: function( optionalMessage ) 
    {
        switchTo( this.resources.TEMPLATE_NAME_LOADING, { optional_message: optionalMessage } );
    },

    switchToMainTemplate: function() 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "switchToMainTemplate() called" );
        }
        /* DebugOnlyCode - END */

        let syncFields = this.zendesk_user.getFieldSyncInfo( this.mailshot_sync_user );
        let isInSync = this.zendesk_user.isInSync( syncFields );

        let formData = 
        {
            'zendesk_user'      : this.zendesk_user,
            'mailchimp_user'    : this.mailshot_sync_user,
            'sync_fields'       : syncFields,
            'monkey_URL'        : this.zendesk_user.isExcluded() ? "./img/exclude_monkey.png" : ( isInSync ? "./img/insync_monkey.png" :  "./img/outofsync_monkey.png" ),
            'buttons': 
            {
                'exclude'       : { 
                    'show'              : true, 
                    'classNameInsert'   : this.zendesk_user.isExcluded() ? " active" : "", 
                    'label'             : "Exclude", 
                    'onclick'           : 'excludeButtonOnClick()' 
                },
                'organization'  : { 
                    'show'              : ( this.zendesk_user.belongsToOrganization() ), 
                    'classNameInsert'   : this.zendesk_user.isOrganization() ? " active" : "", 
                    'label'             : this.mailchimp_organisation_button_label, 
                    'onclick'           : 'organizationButtonOnClick()' 
                },
                'standard'      : { 
                    'show': true, 
                    'classNameInsert'   : this.zendesk_user.isDefault() ? " active" : "", 
                    'label'             : this.mailchimp_standard_button_label, 
                    'onclick'           : 'standardButtonOnClick()'
                }
            },
            'display_params':
            {
                'customer_type_not_set'     : this.zendesk_user.isNotset(),
                'customer_type_exclude'     : this.zendesk_user.isExcluded(),
                'customer_type_included'    : this.zendesk_user.isIncluded(),
                'customer_type_organization': this.zendesk_user.isOrganization(),
                'customer_type_standard'    : this.zendesk_user.isDefault(),
                'user_in_sync'              : isInSync,
                'DEBUG'                     : debug_mode
            }
        };

        thisV2Client.main_template_form_data = formData;

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Switching to template '%s' with form data: %o ", ( this.modalMode ? this.resources.TEMPLATE_NAME_MAIN_MODAL_MODE : this.resources.TEMPLATE_NAME_MAIN ), formData); }
        switchTo( ( this.modalMode ? this.resources.TEMPLATE_NAME_MAIN_MODAL_MODE : this.resources.TEMPLATE_NAME_MAIN ), formData );
        /* DebugOnlyCode - END */

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished");
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    switchToErrorMessage: function( errorResponse, overrideMessage, additionalButtonText, additionalButtonHandle, additionalButtonOnclick ) 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "switchToErrorMessage ( errorResponse, overrideMessage, additionalButtonText, additionalButtonHandle ) called" );
            console.log( "ARG1: errorResponse = %o", errorResponse );
            console.log( "ARG2: overrideMessage = %o", overrideMessage );
            console.log( "ARG3: additionalButtonText = %o", additionalButtonText );
            console.log( "ARG4: additionalButtonHandle = %o", additionalButtonHandle );
            console.log( "ARG5: additionalButtonOnclick = %o", additionalButtonOnclick );

        }
        /* DebugOnlyCode - END */

        //check for catchall error conditions
        try
        {
            if( errorResponse.status === 0 && typeof( overrideMessage ) === "undefined" || overrideMessage === null || overrideMessage === "error" )
            {
                    overrideMessage = "Could not connect to API, Please check your internet connection";
            }
        }
        catch(e) { }

        let formData = 
        {
          'errorResponse'			: errorResponse,
          'overrideMessage' 		: ( typeof( overrideMessage ) === "undefined" || overrideMessage === "error") ? null:  overrideMessage, /* sometimes just the string error is passed as the 2nd param!) */
          'additionalButtonText' 	: ( typeof( additionalButtonText ) === "undefined" ) ? null : additionalButtonText,
          'additionalButtonHandle' 	: ( typeof( additionalButtonHandle ) === "undefined" ) ? null : additionalButtonHandle,
          'additionalButtonOnclick' 	: ( typeof( additionalButtonOnclick ) === "undefined" ) ? null : additionalButtonOnclick
        };

        switchTo( this.resources.TEMPLATE_NAME_SHOWERROR, formData );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    }

    ,debugButtonOnClick: function()
    {
        console.log( 'Starting debugButtonOnClick' );
        console.dir( this );
        return false;
    }
	
  };

};
