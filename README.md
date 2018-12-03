# aws-dynamic-dns

Tired of all the low cost, easy to use Dynamic DNS options out there? Want you see a table, do you think "I could make that"?

If you answered yes to either of these questions, you are a good candidate for `aws-dynamic-dns`. This project has two main components: a lambda function to update DNS records, and an Ansible Playbook to configure and deploy your cloud stack.

## The Lambda

The Lambda function here doesn't do all that much. It grabs the= IP of the client that invoked it, and sets that IP into a DNS record. The DNS record is specified in the request, and is created if needed (upsert).

## AWS Components

- Route53 manages DNS records
- Lambda processes incoming requests & updates DNS
- API Gateway manages API-Key authentication, and HTTP routing
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

You need tell the Ansible Playbook about your AWS account and domain name.

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
Set this field to the domain that you want to use for the Dynamic DNS API itself. The default is to add `api.` to the `DYNDNS_DOMAIN` set (above), however you can set it to any other domain that you control.

## Running

Simply run `sh deploy.sh` after setting all of the required values in that script.

### Special First Run Handling

After the first run succeeds, you must set the API Gateway ID in the script (instructions above). Once this step is complete, you can run this playbook over and over to deploy updates or make changes.

## Author

Adam Kaplan <adkap at adkap dot com>
  
## License

This project is licensed under the MIT License
