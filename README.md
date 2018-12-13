# aws-dynamic-dns

Tired of all the low cost easy to use Dynamic DNS options out there? When you see a table, do you think "I could make that?"

If you answered yes to either of these questions, you are a good candidate for `aws-dynamic-dns`. This project has two main components: a lambda function to update DNS records, and an Ansible Playbook to configure and deploy your cloud stack.

## The Lambda

The Lambda function here doesn't do all that much. It grabs the IP of the client that invoked it and sets that IP into a DNS record. The DNS record is specified in the request and is created if needed (upsert).

## AWS Components

- Route53 manages DNS records
- Lambda processes incoming requests & updates DNS
- API Gateway manages API-Key authentication and HTTP routing
- CloudWatch provides request and lambda execution logging
- Certificate Manager provides SSL

## Installing

Clone repository from git
```
git clone git@github.com:adamkaplan/aws-dynamic-dns.git
```
  
### Requirements

- An AWS account
- A domain name to use with Route53 (already on-boarded)

Optional: If you want to use a custom domain for the API itself:
- Setup Amazon Certificate Manager to provide SSL certificates for your domain

Locally, you need to install the following:
- [Install Ansible](https://docs.ansible.com/ansible/2.7/installation_guide/intro_installation.html)
- [Optional] [Install AWS Command Line](https://docs.aws.amazon.com/cli/latest/userguide/installing.html) if you intend to use a custom domain for the API itself

### Setup

You need to tell the Ansible Playbook about your AWS account and domain name.

Edit the file `deploy.sh`
```
export AWS_ACCESS_KEY_ID=''
export AWS_SECRET_ACCESS_KEY=''
```
Generate a new AWS access key and secret key in the IAM Console by following [this AWS Guide](https://docs.aws.amazon.com/general/latest/gr/managing-aws-access-keys.html). These keys authorize the Ansible Playbook to configure your AWS account on your behalf.

```
export AWS_REGION='us-east-1'
```
Set the AWS region that you want to use. Regions have different costs and geographic locations. It's best to keep the region close to where you will be using the API. However, this is not a big deal with API Gateway because you can choose to deploy the API to "the CloudFront Edge", which I will not cover here.

```
#export API_GATEWAY_ID=''
```
This setting should be left blank for the first run. The API Gateway ID is not known until the gateway is first created. So, after the first run you can pull the API Gateway ID from the Ansible logs, or from the AWS console. It looks like this `dav54fvlrg`.

```
export DYNDNS_DOMAIN='example.com'
```
Set this to the main zone that will be used for Dynamic DNS. For example, if you set `DYNDNS_DOMAIN=mydomain.com`, it means that a dynamic DNS entry for `home` would end up being `home.mydomain.dom`.

```
export DYNDNS_API_DOMAIN="api.${DYNDNS_DOMAIN}"
```
Set this field to the domain that you want to use for the Dynamic DNS API itself. The default is to add `api.` to the `DYNDNS_DOMAIN` set (above), however, you can set it to any other domain that you control.

## Running

Simply run `sh deploy.sh` after setting all of the required values in that script.

### Special First Run Handling

After the first run succeeds, you must set the API Gateway ID in the script (instructions above). Once this step is complete, you can run this playbook over and over to deploy updates or make changes.

## Setting up a new Dynamic DNS client

The final step is to set up a client to hit the API at periodic intervals to update a Dynamic DNS record. Luckily the client requirements are trivial. You could even use a browser bookmark to manually update the Dynamic DNS, but the most reliable strategy is to use a cron job.

### Making API Calls

The API has a single HTTP endpoint `PUT /location/<name>` which allows you to set the name for the DynamicDNS entry that will be created or updated. For example, calling `PUT /location/home` will result in home.mydomain.com, and `PUT /location/office` will likewise result in setting office.mydomain.dom.

The API URL is defined by API Gateway using a format comprised of the API Gateway ID, the AWS Region, the API Gateway Stage, and the API Endpoint itself: `https://<apigateway id>.execute-api.<aws region>.amazonaws.com/<apigateway stage>/location/<name>`

For our example configuration above, it would be:
```
# Direct request (replace 'dav54fvlrg' with API Gateway ID and us-east-1 if needed):
curl -v -X PUT https://dav54fvlrg.execute-api.us-east-1.amazonaws.com/production/location/home
```

Alternatively, if you provided a Custom API Domain Name, you can access the API by the friendlier and more official:
```
# For Custom API Domain Only:
curl -v -X PUT https://api.mydomain.com/v1/location/home
```

Run the curl command against your new API. It should result in `{"message":"Forbidden"}` and `HTTP 403`. This is because you haven't created any API keys yet! We'll do that in the next section.

_If you received any other error besides `HTTP 403 Forbidden`, or you got `HTTP 200 OK`, there is a problem. You need to figure out the problem prior to moving on._

### Authorizing a new client

Before we make any calls to the API, each client needs an API Key for use with API Gateway. If you don't use API Keys, anybody on the Internet can mess with your DNS!

#### Method 1: Using AWS Web Console

##### Creating an API Usage Plan

Head over to the API Gateway page on AWS Console, and open the Usage Plan section (Link for us-east-1 is [here](https://console.aws.amazon.com/apigateway/home?region=us-east-1#/usage-plans)).

Hit the `Create` button, and fill out the form sections "Name and Description", "Throttling" and "Quota". You can use any values you want. It is highly recommended to set a throttle and quota to prevent runaway AWS costs. A good default for this service is for clients to update Dynamic DNS hourly.

For an hourly Dynamic DNS update, use these values:
- Name: `DynamicDNS Hourly Plan`
- Enable Throttling: checked
  - Rate: 1
  - Burst: 1
- Enable Quota: checked
  - `800` requests per `Month`.
- Press `Save`

Under *Associated API Stages*, press "Add API Stage". Select `DynamicDNS` for API and `production` for Stage.

Now that we have defined a usage plan and associated it with the new API, let's create some keys!

##### Issue new API Keys for a Usage Plan

API Keys should be issued to each client and kept secure like passwords. Anybody with an API Key can use your Dynamic DNS API, which means they can alter you DNS – no good!

Proceed to the API Gateway page on AWS Console, and open the API Keys section (Link for us-east-1 is [here](https://console.aws.amazon.com/apigateway/home?region=us-east-1#/api-keys/create)).

Select `Create API Key` from the `Action` menu. Enter a `Name` for the key, select `Auto Generate`, and `Save`.

On the next screen, hit the `Add to Usage Plan` button, enter the name of the plan created in the previous step (`DynamicDNS Hourly Plan`) and press the tiny CHECK button on the right.

Finally, click `Show` to get your new API Key! It should look like this `3qAqBbm4ho3DYPLj9X3XU9eBhk7UwkM461LIuujL`.

## Setting Up A Cron Job

To update the Dynamic DNS hourly on most Linux, use this command (replacing example values):
```
sudo echo "0 * * * * /bin/curl https://abcdef.execute-api.us-east-1.amazonaws.com/production/location/home -v -X PUT -H \"x-api-key: xxxxx\"" >> /etc/cron.d/50dyndns-update
```

Or, for a custom API domain
```
sudo echo "0 * * * * /bin/curl https://api.mydomain.com/v1/location/home -v -X PUT -H \"x-api-key: xxxxx\"" >> /etc/cron.d/50dyndns-update
```

## Author

Adam Kaplan <adkap at adkap dot com>
  
## License

This project is licensed under the MIT License
