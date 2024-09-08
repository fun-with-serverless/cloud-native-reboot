# cloud-native-reboot
A workshop designed for developers and system architects looking to modernize their legacy web applications using cutting-edge AWS cloud native technologies.


aws cloudformation create-stack --stack-name GalacticGamersStack --template-body file://galactic-gamers-cf.yaml --parameters ParameterKey=DBPassword,ParameterValue=MtSecretPassword --capabilities CAPABILITY_IAM


## 🖥️ How to run locally
1. Make sure you have `poetry` installed.
2. Run `poetry install`.
3. Run `poetry run mkdocs serve` to have the workshop running locally.