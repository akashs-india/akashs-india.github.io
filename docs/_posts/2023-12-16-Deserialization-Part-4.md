---
title: "Deserialization Vulnerabilities in .Net - Part 4"
sub_title: "A deep dive"
excerpt: Understanding solutions to securing your services against deserialization vulnerabilities.
categories:
  - Security
elements:
  - content
  - css
  - formatting
  - html
  - markup
last_modified_at: 2023-12-17T10:16:49-05:00
---

**Note:** Before you go through this blog, you are highly recommended to read [Part 1](https://akashs-india.github.io/docs/security/Deserialization-Part-1/ "Part 1"), [Part 2](https://akashs-india.github.io/docs/security/Deserialization-Part-2/ "Part 2") and [Part 3](https://akashs-india.github.io/docs/security/Deserialization-Part-3/ "Part 3")

In this part we focus on exploring appraches to secure our services against deserialization vulnerabilities.

## What is the main factor resulting in deserialization vulnerabilities?

One of the key factors leading to deserialization vulnerabilities is when "The type to be deserialized is controlled by user input".
For example, in the case of binary formatter, the type of the object to be deserialized was read from the serialized payload sent by the client itself.

## What are the solutions to protect against deserialization attacks?

### Get rid of the serialization and deserialization

Though this might sound too trivial and not practical, there have been deserialization attacks targeting companies who've realized that they did not need to use serialization to transport the data.
For example, if you are just passing a string text from a client to server, there might be no reason for you to first serialize the data and then deserialize it.

In most cases, however, given you have good understanding of serialization and deserialization, you would not fall into this solution bucket.

### Use a binder during serialization and deserialization

As talked about in part 2, several serializers/deserializers provide the ability to hook into the serialization/deserialization process through custom binders.
For example in the code shown below, we use an instance of the BlockListBinder class as a binder in the binary formatter instance used for deserializaiton in the DeserializeObject function.

<b>Note:</b> Zoom into images for clarity

![Using a binder (with binary formatter) to implement a blocked list of type to not deserialize](/images/DeserializationPart4_Fig1.png)

Once the formatter.Deserialize is called, internally the binary formatter reads the name of the assembly and the types to be instantiated from the serialized payload. Before it instantiates the type it first looks at performing type resolution given the assembly name and type name in string form. In case we are using a binder, it would call the BindToType function that we have defined. In our implementation of the BindToType function we throw if the type is one of the know vulnerable types that we have put into our blockTypes list. This prevents the deserialization of a known vulnerable type.

The issue with the above approach is that new vulnerable types continue to be found, hence making it difficult to keep the blocked list upto date. The alternate approach is to use an allowed list of types that we expect the binary formatter to deserialize. In this approach though you need to take care that you include all the expected types and their member types in the allowed types, which if not done could lead to failure of genuine scenarios.

From personal experience, large systems have several serialization and deserialization requirements spread across the product/service. In several instances there are custom deserialization flows implemented which could potentially allow circumventing your binder based protections. Its due to this reason that I feel the binder based approach is more like bandaging your service, where use of a secure serializer/deserializer could be a more complete approach from security standpoint.

### Signing serialized data

Signing the serialized data, whose signature can then be validated prior to deserialization is another approach to prevent deserialization of untrusted malicious data.
This technique, however, is only possible to implement in scenarios where we have a mechanism to share information on signing keys amongst only the trusted parties. For example for communication between 2 servers that you own, you could have a certificate installed on both servers the private key of which can then be used for signing and validating the signature of the serialized payload.

![Signing serialization data](/images/DeserializationPart4_Fig2.png)

### Using secure deserializers

Usage of secure deserializers which do not rely on the passed input to figure out the type of the object to be instantiated is a great way to improve protection of your services against deserialization attacks. Various secure deserializers include protobuf, json.net (let typeNameHandling be none), etc.

That's all from this blog series. Hopefully we'll dive into some insights into protobuf in a future blog. Hope the series helped you get better insights into serialization/deserialization, associated vulnerabilities and potential fixes!

![Signing serialization data](/images/ThatsAllFolks.png)