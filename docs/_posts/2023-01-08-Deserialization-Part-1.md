---
title: "Deserialization Vulnerabilities in .Net - Part 1"
sub_title: "A deep dive"
excerpt: Explains what is serialization/deserialization and why it is needed. Also provides insights into the information that this blog series is expected to cover.
categories:
  - Security
elements:
  - content
  - css
  - formatting
  - html
  - markup
last_modified_at: 2023-01-07T10:16:49-05:00
---
This 4 part blog series aims to provide an overview of what is deserialization and why is it vulnerable. I do so from the perspective of .Net wherein I use C# as the primary language. While explaining the serialization/deserialization and the corresponding vulnerabilities, I have used the binaryFormatter which is inherently unsafe for deserialization and hence more susceptible to deserialization attacks.

The 4 parts of the series convey information as follows:

  1. <b>Part 1</b> - Explains what is an object in memory. Post that it uses the same to explain why there is a need for serialization and deserialization.
  2. <b>Part 2</b> - Explains the serialization and deserialization process via binaryFormatter in detail and also gives you insights into the actual serialized payload and how to understand the same.
  3. <b>Part 3</b> - Uses ysoserial to create a malicious payload and uses understanding from previous parts to demonstrate and explain a deserialization attack.
  4. <b>Part 4</b> - Talks about the different preventive measures that we can take to ensure secure deserialization.


## Storage of an object in memory

In .Net the CLR manages the allocation and destruction of objects. The memory management in .net involves storing data on the stack or in the 4 different types of heaps maintained by the CLR - code heap, small object heap (SOH), large object heap (LOH) and the process heap. 

Objects in the heap memory are not stored in a linear manner with all information at one place. Instead they are stored like a graph. For example consider the class:


```c#
[Serializable]
public class Demo
{
    public string ApplicationName { get; set; } = "Akash application data";
    public int ApplicationId { get; set; } = 1001;
}
```

On creating an object of the above class, we can use windbg to see the object in memory. As this is a reference type it will be created in the heap (in the SOH to be precise).
On running !dumpheap we can see the object created:

![Looking at objects in heap memory](/images/DeserializationPart1_mem1.png)

Clicking on the MT column show us the details of the object we created:

![Looking at parent object](/images/DeserializationPart1_mem2.png)

The demo object contains a string and an int. The primitive type int gets stored directly in the object. But for the string which is a reference type, only the reference is stored in the demo object. The reference points to the memory location where the string is actually stored. Going to that address (03562500), shows us the string value:

![Looking at inner object](/images/DeserializationPart1_mem3.png)

With this you should be able to understand that the content of an entire object could be stored in non contiguous chunks in memory.

## Need for deserialization and serialization

While creating applications we often come across use cases involving:
1. Sharing information between servers and services
2. Writing information from memory to disk and reading it back when need arises. (for example creating pickle files in python)
3. And many more

In multiple such situations there is a need to collect all information about an object (from its object graph in memory) into a form such that it can be efficiently stored/transported.
This process of converting the data stored in an object graph in memory into a serialized stream is called serialization.

![Serialization](/images/DeserializationPart1_fig4.png)

And as you would have guessed recreating the object in memory from the serialized data is called deserialization.

![Deserialization](/images/DeserializationPart1_fig5.png)

Just like any other protocol, the program deserializing the serialized data is expected to able to correctly understand the same and create the object graph using it. For this we need to define a format into which the data can be serialized and from which it can be deserialized. 
There are several formats that you can use for serialization/deserialization based on the different deserializers/searializers. Some of them are: binary, json, xml and the list goes on.

In the next blog we will dive deep into serialization and deserialization via a binary formatter. This knowledge will them help us understand the vulnerabilities involves in the deserialization process.

